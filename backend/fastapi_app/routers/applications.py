"""
Applications Router - Job Application Management

Endpoints:
- POST /applications/{job_id} - Apply for a job
- GET /applications/me - Get current user's applications
- GET /applications - Get all applications (Admin/HR)
- PUT /applications/{application_id}/status - Update application status (Admin/HR)
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import asyncio

from dependencies import get_supabase, CustomSupabaseClient, get_user_with_role, verify_hr_or_admin
from core.logging import api_logger, db_logger, log_error
from agents.scoring_agent import evaluate_answer

router = APIRouter()

# ============================================
# Pydantic Models
# ============================================

class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    # We can pull other details from candidate profile automatically

class ApplicationStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(reviewing|shortlisted|rejected|hired)$")
    feedback: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    applicant_id: str
    status: str
    cover_letter: Optional[str]
    resume_url: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    created_at: str
    job_title: Optional[str] = None # Enriched field
    feedback: Optional[str] = None
    technical_assessment_completed: bool = False

class QuestionAnswer(BaseModel):
    question_id: str
    answer: str

class AssessmentSubmission(BaseModel):
    answers: List[QuestionAnswer]

class AssessmentResponse(BaseModel):
    message: str
    scored_count: int

# ============================================
# Endpoints
# ============================================

@router.post("/{app_id}/technical-assessment/submit", status_code=status.HTTP_200_OK)
async def submit_technical_assessment(
    app_id: str,
    submission: AssessmentSubmission,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """
    Submit technical assessment answers.
    Triggers AI Agent to evaluate each answer and score it.
    """
    api_logger.info(f"User {user['id']} submitting assessment for application: {app_id}")

    try:
        # 1. Verify application belongs to user
        app = await supabase.table("job_applications").select("id, job_id, applicant_id").eq("id", app_id).single().execute()
        
        if not app.data:
            raise HTTPException(status_code=404, detail="Application not found")
            
        if app.data["applicant_id"] != user["id"]:
            # Basic security check
            raise HTTPException(status_code=403, detail="Not authorized to submit for this application")

        job_id = app.data["job_id"]

        # 2. Fetch all questions and desired answers for the job
        questions_resp = await supabase.table("technical_assessments").select("id, question, desired_answer").eq("job_id", job_id).execute()
        questions_map = {q["id"]: q for q in questions_resp.data} if questions_resp.data else {}

        if not questions_map:
             raise HTTPException(status_code=400, detail="No technical questions found for this job")

        # 3. Insert initial responses (unscored)
        unscored_responses = [
            {
                "application_id": app_id,
                "question_id": qa.question_id,
                "answer": qa.answer,
                "ai_score": None,
                "ai_reasoning": "Pending analysis..."
            }
            for qa in submission.answers
            if qa.question_id in questions_map
        ]

        if unscored_responses:
            await supabase.table("technical_assessment_responses").upsert(
                unscored_responses, 
                on_conflict="application_id,question_id"
            ).execute()

        # 4. Trigger Background Scoring
        background_tasks.add_task(
            run_ai_scoring,
            app_id,
            submission.answers,
            questions_map,
            supabase # Pass the client (might need fresh one if scoped?) -> Actually supabase client here is request scoped.
            # Ideally we should instantiate a new client or use service role for background tasks.
            # But specific dependency injection client might close.
            # Let's use a fresh service role client for background tasks to be safe.
        )
        
        return AssessmentResponse(
            message="Assessment submitted. AI analysis is running in the background.",
            scored_count=len(unscored_responses)
        )
    except Exception as e:
        api_logger.error(f"Error submitting assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import BackgroundTasks

async def run_ai_scoring(app_id: str, answers: List[QuestionAnswer], questions_map: dict, supabase_client=None):
    """
    Background task to score answers.
    """
    # Create a fresh service role client if not passed or to ensure persistence
    # Re-import to avoid circular dependency if needed, or use the one from dependencies
    from dependencies import CustomSupabaseClient
    import os
    
    # We need a fresh client because the request scoped one might be closed?
    # Actually fastapi dependency usually works if used within request, but background tasks run after response.
    # Better safe: create new client.
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = CustomSupabaseClient(url, key)
    
    api_logger.info(f"Starting background AI scoring for app {app_id}")
    
    scored_updates = []
    
    async def process_single_answer(qa: QuestionAnswer):
        q_data = questions_map.get(qa.question_id)
        if not q_data: return None

        try:
            # Run AI Evaluation
            evaluation = await evaluate_answer(
                question=q_data["question"],
                desired_answer=q_data["desired_answer"],
                candidate_answer=qa.answer
            )
            
            return {
                "application_id": app_id,
                "question_id": qa.question_id,
                "ai_score": evaluation.get("score"),
                "ai_reasoning": evaluation.get("reasoning")
            }
        except Exception as e:
            log_error(e, context=f"bg_process_answer: {qa.question_id}")
            return {
                "application_id": app_id,
                "question_id": qa.question_id,
                 "ai_score": 0,
                "ai_reasoning": f"Analysis failed: {str(e)}"
            }

    tasks = [process_single_answer(qa) for qa in answers]
    results = await asyncio.gather(*tasks)
    
    valid_updates = [r for r in results if r]
    
    if valid_updates:
        # Upsert each or bulk? Bulk upsert works for multiple rows.
        # We only need to update score/reasoning.
        # But upsert requires all primary keys/constraints.
        # We have application_id, question_id.
        # We need to make sure we don't overwrite "answer" with null if we didn't include it.
        # The 'valid_updates' above lacks 'answer'.
        # So we should probably include 'answer' to be safe or use specific update logic.
        # Bulk update in supabase usually requires all columns or it might set missing ones to null?
        # No, 'upsert' updates provided columns. But better to include 'answer' just in case.
        
        # Let's just include "answer" from the original input to be safe and simple.
        # Map original answers
        answers_map = {a.question_id: a.answer for a in answers}
        
        for r in valid_updates:
            r["answer"] = answers_map.get(r["question_id"])
            
        await supabase.table("technical_assessment_responses").upsert(
            valid_updates, 
            on_conflict="application_id,question_id"
        ).execute()
        
    api_logger.info(f"Background scoring completed for app {app_id}")



@router.post("/{job_id}", status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_id: str,
    application: ApplicationCreate,
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Submit an application for a job."""
    api_logger.info(f"User {user['id']} applying for job: {job_id}")
    
    try:
        # 1. Verify job exists and is open
        job = await supabase.table("job_roles").select("status, is_open, title").eq("id", job_id).single().execute()
        
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.data["status"] != "approved" or not job.data["is_open"]:
            raise HTTPException(status_code=400, detail="Job is not accepting applications")
        
        # 2. Check for existing application
        existing = await supabase.table("job_applications").select("id").eq("job_id", job_id).eq("applicant_id", user["id"]).execute()
        
        if existing.data:
            raise HTTPException(status_code=409, detail="You have already applied for this job")
            
        # 3. Fetch candidate profile to auto-populate fields
        profile = await supabase.table("candidate_profiles").select("*").eq("id", user["id"]).single().execute()
        p_data = profile.data or {}
        
        # 4. Insert application
        app_data = {
            "job_id": job_id,
            "applicant_id": user["id"],
            "status": "submitted",
            "cover_letter": application.cover_letter,
            # Auto-populate from profile
            "resume_url": p_data.get("resume_url"),
            "phone": p_data.get("phone"),
            "linkedin_url": p_data.get("linkedin_url"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = await supabase.table("job_applications").insert(app_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to submit application")
            
        return result.data[0]

    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="apply_for_job")
        raise HTTPException(status_code=500, detail="Application submission failed")

@router.get("/me")
async def get_my_applications(
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Get applications submitted by the current user."""
    api_logger.info(f"Fetching applications for user: {user['id']}")
    
    try:
        # Fetch applications with Job details
        # Supabase-py default postgrest client allows joining? 
        # For simplicity, we might just fetch apps and enrich or use a view.
        # Let's try explicit select for enrichment if relation exists, or just fetch basic first.
        
        # Assuming foreign keys are set up, we can do: select(*, job_roles(title))
        result = await supabase.table("job_applications").select("*, job_roles(title)").eq("applicant_id", user["id"]).order("created_at", desc=True).execute()
        
        # Custom logic to check for technical assessment completion
        # We need to fetch technical_assessment_responses count for each app
        # Optimization: fetch all relevant application IDs and check existence in responses table
        apps = []
        if result.data:
            app_ids = [item["id"] for item in result.data]
            
            # Get list of app IDs that have responses
            responses_query = await supabase.table("technical_assessment_responses").select("application_id").in_("application_id", app_ids).execute()
            completed_app_ids = set()
            if responses_query.data:
                completed_app_ids = {r["application_id"] for r in responses_query.data}

            for item in result.data:
                 # Flatten job_roles.title into job_title
                 job = item.get("job_roles")
                 if job and isinstance(job, dict):
                     item["job_title"] = job.get("title")
                 elif job and isinstance(job, list) and len(job) > 0: # handle potential list return
                      item["job_title"] = job[0].get("title")
                 
                 item["technical_assessment_completed"] = item["id"] in completed_app_ids
                 apps.append(item)
                 
        return apps

    except Exception as e:
        log_error(e, context="get_my_applications")
        raise HTTPException(status_code=500, detail="Failed to fetch applications")

@router.get("")
async def list_all_applications(
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """List all applications (HR/Admin only)."""
    api_logger.info(f"Listing all applications for admin: {user['id']}")
    
    try:
        # Fetch applications with Job details
        result = await supabase.table("job_applications").select("*, job_roles(title)").order("created_at", desc=True).execute()

        apps = []
        if not result.data:
            return apps

        # Collect all applicant IDs to fetch profiles in bulk (filter invalid/empty)
        applicant_ids = [
            item.get("applicant_id")
            for item in result.data
            if item.get("applicant_id")
        ]

        # Fetch profiles (best-effort: don't fail the whole request if this errors)
        profiles_map = {}
        if applicant_ids:
            try:
                p_result = await supabase.table("candidate_profiles").select("id, full_name, email, resume_url, linkedin_url").in_("id", applicant_ids).execute()
                if p_result.data:
                    for p in p_result.data:
                        profiles_map[p["id"]] = p
            except Exception as e:
                log_error(e, context="list_all_applications:profile_lookup")

        for item in result.data:
            # Enrich with job title
            job = item.get("job_roles")
            if job and isinstance(job, dict):
                item["job_title"] = job.get("title")
            elif job and isinstance(job, list) and len(job) > 0:
                item["job_title"] = job[0].get("title")

            # Enrich with candidate details
            profile = profiles_map.get(item.get("applicant_id"))
            if profile:
                item["candidate_name"] = profile.get("full_name")
                item["candidate_email"] = profile.get("email")
                # Fallback to profile data if application data is missing
                if not item.get("resume_url"):
                    item["resume_url"] = profile.get("resume_url")
                if not item.get("linkedin_url"):
                    item["linkedin_url"] = profile.get("linkedin_url")
            else:
                item["candidate_name"] = "Unknown"
                item["candidate_email"] = ""

            apps.append(item)

        return apps

    except Exception as e:
        # log_error(e, context="list_all_applications") # Assuming log_error is available or imported. Using print/logger if not sure.
        # It was imported.
        log_error(e, context="list_all_applications")
        raise HTTPException(status_code=500, detail="Failed to fetch applications")

@router.put("/{app_id}/status")
async def update_application_status(
    app_id: str,
    update: ApplicationStatusUpdate,
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Update application status (e.g. shortlist, reject)."""
    api_logger.info(f"Updating application {app_id} status to {update.status} by {user['id']}")
    
    try:
        data = {
            "status": update.status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Add feedback if provided
        if update.feedback:
             data["feedback"] = update.feedback
             
        result = await supabase.table("job_applications").update(data).eq("id", app_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Application not found")
            
        return result.data[0]

    except Exception as e:
        log_error(e, context="update_application_status")
        raise HTTPException(status_code=500, detail="Failed to update application")


