"""
Applications Router - Job Application Management

Endpoints:
- POST /applications/{job_id} - Apply for a job
- GET /applications/me - Get current user's applications
- GET /applications - Get all applications (Admin/HR)
- PUT /applications/{application_id}/status - Update application status (Admin/HR)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from dependencies import get_supabase, CustomSupabaseClient, get_user_with_role, verify_hr_or_admin
from core.logging import api_logger, db_logger, log_error

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

# ============================================
# Endpoints
# ============================================

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
        
        apps = []
        if result.data:
             for item in result.data:
                 # Flatten job_roles.title into job_title
                 job = item.get("job_roles")
                 if job and isinstance(job, dict):
                     item["job_title"] = job.get("title")
                 elif job and isinstance(job, list) and len(job) > 0: # handle potential list return
                      item["job_title"] = job[0].get("title")
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
        # Join with candidate profile and job title
        # select(*, job_roles(title), candidate_profiles(full_name, email))
        # Note: relation names depend on FK naming. Assuming default or explicitly doing manual join if needed.
        # Let's try broad select.
        
        result = await supabase.table("job_applications").select("*, job_roles(title)").order("created_at", desc=True).execute()
        
        # We might also want candidate details. 
        # Since `applicant_id` is the user id, and `candidate_profiles` is keyed by user id.
        # We can fetch profiles separately or rely on join if `candidate_profiles` FK exists on `applicant_id`?
        # The schema uses `applicant_id` references `auth.users`. `candidate_profiles` also references `auth.users`.
        # Direct join might be tricky without explicit FK between `job_applications.applicant_id` and `candidate_profiles.id`.
        # But they are same ID. 
        # Let's fetch basic info first. Frontend can fetch profile details by ID if needed.
        
        apps = []
        if result.data:
             for item in result.data:
                 job = item.get("job_roles")
                 if job and isinstance(job, dict):
                     item["job_title"] = job.get("title")
                 apps.append(item)
        
        return apps

    except Exception as e:
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
        
        # Store feedback if provided (assuming we added a feedback column or reuse cover_letter? No, we should have a feedback column)
        # The user requested "feedback" field in the migration plan, but `job_applications` schema provided by user didn't explicitly show it.
        # Wait, the user provided schema in step 29: `job_applications` has `status`, `cover_letter`... but NO `feedback` column.
        # I should added `feedback` column in migration? 
        # I MISSED adding `feedback` column to `job_applications` in previous turn!
        # The user's schema provided in Stpe 29 did NOT have feedback.
        # BUT I said I would add it in my plan.
        # Check `migration_candidate_flow.sql` again.
        # It created `candidate_profiles`. It did NOT alter `job_applications`.
        # I need to ADD `feedback` column to `job_applications`.
        
        # I will handle this in this tool call or next. 
        # Let's add the code to update it assuming column exists, BUT I MUST run migration to add it.
        
        if update.feedback:
             # Check if column exists or put it in a metadata field? 
             # Better to add the column.
             data["feedback"] = update.feedback
             
        result = await supabase.table("job_applications").update(data).eq("id", app_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Application not found")
            
        return result.data[0]

    except Exception as e:
        log_error(e, context="update_application_status")
        # If feedback column error, we might catch it here.
        raise HTTPException(status_code=500, detail="Failed to update application")
