
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime

from dependencies import get_supabase, CustomSupabaseClient, verify_hr_or_admin, get_user_with_role
from routers.jobs import (
    JobRoleCreate, 
    JobRoleUpdate, 
    JobRoleResponse, 
    TechnicalQuestion, 
    JobResponsibility,
    JobSkill
)
from core.logging import api_logger, db_logger, log_error, auth_logger

router = APIRouter()

async def verify_employee(user: dict = Depends(get_user_with_role)):
    """Verify user is employee."""
    if user["role"] not in ["employee", "admin"]: # Allow admin to test/act as employee too if needed, or strict?
        # Strict employee check as per module name, but admins usually have override.
        # Let's start with employee or admin for flexibility.
        auth_logger.warning(f"Employee API: Access denied for role: {user['role']}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee privileges required"
        )
    return user

@router.post("/jobs", status_code=status.HTTP_201_CREATED, response_model=JobRoleResponse)
async def create_employee_job(
    job: JobRoleCreate,
    user: dict = Depends(verify_employee),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Create a new job role with responsibilities and skills."""
    api_logger.info(f"Employee {user['id']} creating job: {job.title}")
    
    try:
        # 1. Insert Job Role
        job_data = {
            "title": job.title,
            "department": job.department,
            "description": job.description,
            "requirements": job.requirements,
            "employment_type": job.employment_type,
            "work_mode": job.work_mode,
            "location": job.location,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "key_business_objective": job.key_business_objective,
            "min_experience": job.min_experience,
            "is_english_required": job.is_english_required,
            "is_coding_required": job.is_coding_required,
            "is_technical_required": job.is_technical_required,
            "created_by": user["id"],
            "status": "pending",
            "is_open": True,
            "version": 1
        }
        
        result = await supabase.table("job_roles").insert(job_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create job role")
        
        new_job = result.data[0]
        job_id = new_job["id"]
        
        # 2. Insert Technical Questions
        if job.technical_questions:
            q_data = [{"job_id": job_id, "question": q.question, "desired_answer": q.desired_answer} for q in job.technical_questions]
            await supabase.table("technical_assessments").insert(q_data).execute()
            
        # 3. Insert Responsibilities
        if job.responsibilities:
            r_data = [{"job_id": job_id, "content": r.content, "importance": r.importance} for r in job.responsibilities]
            await supabase.table("job_responsibilities").insert(r_data).execute()
            
        # 4. Insert Skills
        if job.skills:
            s_data = [{"job_id": job_id, "skill_name": s.skill_name, "min_years": s.min_years, "is_mandatory": s.is_mandatory} for s in job.skills]
            await supabase.table("job_skills").insert(s_data).execute()
        
        # 5. Create Approval Request
        await supabase.table("approval_requests").insert({
            "job_id": job_id,
            "requested_by": user["id"],
            "status": "pending"
        }).execute()
        
        # 6. Construct Response (Fetch full object to be safe or construct manually)
        # Fetching ensures we get IDs of created items if needed, but for performance we can just attach them.
        # Let's return the simplified response for now, or re-fetch. Re-fetching is safer.
        return await get_employee_job(job_id, user, supabase)

    except Exception as e:
        log_error(e, context="create_employee_job")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs", response_model=List[JobRoleResponse])
async def list_employee_jobs(
    user: dict = Depends(verify_employee),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """List jobs created by the logged-in employee."""
    try:
        result = await supabase.table("job_roles").select("*").eq("created_by", user["id"]).order("created_at", desc=True).execute()
        return result.data or []
    except Exception as e:
        log_error(e, context="list_employee_jobs")
        raise HTTPException(status_code=500, detail="Failed to list jobs")

@router.get("/jobs/{job_id}", response_model=JobRoleResponse)
async def get_employee_job(
    job_id: str,
    user: dict = Depends(verify_employee),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Get details of a specific job owned by the employee."""
    try:
        # Verify ownership
        job_res = await supabase.table("job_roles").select("*").eq("id", job_id).single().execute()
        if not job_res.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = job_res.data
        if job["created_by"] != user["id"] and user["role"] != "admin":
             raise HTTPException(status_code=403, detail="Not authorized")
                
        # Fetch related data in parallel or sequence
        # Supabase-py doesn't strictly support asyncio.gather for these client calls easily if they aren't async-native in the same loop, but they are awaited.
        
        questions = await supabase.table("technical_assessments").select("*").eq("job_id", job_id).execute()
        responsibilities = await supabase.table("job_responsibilities").select("*").eq("job_id", job_id).execute()
        skills = await supabase.table("job_skills").select("*").eq("job_id", job_id).execute()
        
        job["technical_questions"] = questions.data or []
        job["responsibilities"] = responsibilities.data or []
        job["skills"] = skills.data or []
        
        return job
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="get_employee_job")
        raise HTTPException(status_code=500, detail="Failed to fetch job")

@router.patch("/jobs/{job_id}", response_model=JobRoleResponse)
async def update_employee_job(
    job_id: str,
    updates: JobRoleUpdate,
    user: dict = Depends(verify_employee),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Update a job. Resets approval status."""
    try:
        # 1. Verify existence and ownership
        existing_res = await supabase.table("job_roles").select("*").eq("id", job_id).single().execute()
        if not existing_res.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        existing = existing_res.data
        if existing["created_by"] != user["id"] and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        # 2. Check Optimistic Locking
        if updates.current_version and updates.current_version != existing.get("version", 1):
             raise HTTPException(status_code=409, detail="Job has been modified by another user")

        # 3. Prepare Update Data
        update_data = {k: v for k, v in updates.dict().items() 
                       if v is not None and k not in ["current_version", "technical_questions", "responsibilities", "skills"]}
        
        if existing["status"] == "approved":
            update_data["status"] = "pending"
            update_data["approved_by"] = None
            update_data["approved_at"] = None
        
        update_data["version"] = existing.get("version", 1) + 1
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        if update_data:
            await supabase.table("job_roles").update(update_data).eq("id", job_id).execute()
            
        # 4. Update Related Tables (Full Replace Strategy)
        if updates.technical_questions is not None:
            await supabase.table("technical_assessments").delete().eq("job_id", job_id).execute()
            if updates.technical_questions:
                await supabase.table("technical_assessments").insert(
                    [{"job_id": job_id, "question": q.question, "desired_answer": q.desired_answer} for q in updates.technical_questions]
                ).execute()

        if updates.responsibilities is not None:
             await supabase.table("job_responsibilities").delete().eq("job_id", job_id).execute()
             if updates.responsibilities:
                await supabase.table("job_responsibilities").insert(
                    [{"job_id": job_id, "content": r.content, "importance": r.importance} for r in updates.responsibilities]
                ).execute()
                
        if updates.skills is not None:
             await supabase.table("job_skills").delete().eq("job_id", job_id).execute()
             if updates.skills:
                await supabase.table("job_skills").insert(
                    [{"job_id": job_id, "skill_name": s.skill_name, "min_years": s.min_years, "is_mandatory": s.is_mandatory} for s in updates.skills]
                ).execute()
        
        # 5. Re-trigger approval if needed
        if existing["status"] == "approved":
             await supabase.table("approval_requests").insert({
                "job_id": job_id,
                "requested_by": user["id"],
                "status": "pending",
                "reason": "Re-approval required after edit"
            }).execute()

        return await get_employee_job(job_id, user, supabase)

    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="update_employee_job")
        raise HTTPException(status_code=500, detail=str(e))
