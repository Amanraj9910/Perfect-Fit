"""
Jobs Router - Job Role Management with Approval Workflow

Endpoints:
- POST /jobs - Create new job role (employee/admin)
- GET /jobs - List job roles (filtered by role)
- GET /jobs/pending - List pending approval jobs (hr/admin)
- GET /jobs/public - List approved open jobs (public)
- GET /jobs/{id} - Get job details
- PATCH /jobs/{id} - Update job (owner/admin, resets approval if approved)
- DELETE /jobs/{id} - Delete job (owner/admin)
- PATCH /jobs/{id}/approve - Approve job (hr/admin)
- PATCH /jobs/{id}/reject - Reject job (hr/admin)
- PATCH /jobs/{id}/close - Close job (hr/admin)
- POST /jobs/{id}/apply - Apply for job (candidate)
- GET /jobs/{id}/applications - List applications (hr/admin)
- GET /jobs/{id}/approvals - Get approval history (hr/admin)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import os

from dependencies import get_supabase, CustomSupabaseClient, get_user_with_role, verify_hr_or_admin
from core.logging import api_logger, db_logger, log_error, auth_logger

router = APIRouter()


# ============================================
# Pydantic Models
# ============================================


# ============================================
# Pydantic Models
# ============================================

class TechnicalQuestion(BaseModel):
    question: str = Field(..., min_length=5)
    desired_answer: str = Field(..., min_length=2)
    id: Optional[str] = None # Optional for creation

class JobResponsibility(BaseModel):
    content: str = Field(..., min_length=5)
    importance: str = Field("Medium", pattern="^(Low|Medium|High)$")
    id: Optional[str] = None

class JobSkill(BaseModel):
    skill_name: str = Field(..., min_length=1)
    min_years: int = Field(0, ge=0)
    is_mandatory: bool = True
    id: Optional[str] = None

class JobRoleCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    department: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=10)
    requirements: str = Field(..., min_length=10) # Keeping for backward compatibility or summary
    
    # New Fields
    employment_type: str = Field(..., min_length=2) # Full-time, Contract, etc.
    work_mode: str = Field(..., min_length=2) # Remote, Hybrid, On-site
    location: str = Field(..., min_length=2)
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    key_business_objective: Optional[str] = None
    min_experience: int = Field(0, ge=0)
    
    # Assessment Flags
    is_english_required: bool = False
    is_coding_required: bool = False
    is_technical_required: bool = False
    
    # Related Data
    technical_questions: List[TechnicalQuestion] = []
    responsibilities: List[JobResponsibility] = []
    skills: List[JobSkill] = []


class JobRoleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, min_length=10)
    requirements: Optional[str] = Field(None, min_length=10)
    
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    key_business_objective: Optional[str] = None
    min_experience: Optional[int] = None
    
    is_english_required: Optional[bool] = None
    is_coding_required: Optional[bool] = None
    is_technical_required: Optional[bool] = None

    technical_questions: Optional[List[TechnicalQuestion]] = None
    responsibilities: Optional[List[JobResponsibility]] = None
    skills: Optional[List[JobSkill]] = None
    
    current_version: Optional[int] = Field(None, description="Current version for optimistic locking")


class JobRoleResponse(BaseModel):
    id: str
    title: str
    department: str
    description: str
    requirements: str
    
    # New Fields
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    key_business_objective: Optional[str] = None
    min_experience: Optional[int] = None
    is_english_required: bool = False
    is_coding_required: bool = False
    is_technical_required: bool = False
    
    status: str
    is_open: bool
    created_by: Optional[str]
    created_at: str
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    version: int = 1
    
    technical_questions: Optional[List[TechnicalQuestion]] = None
    responsibilities: Optional[List[JobResponsibility]] = None
    skills: Optional[List[JobSkill]] = None



class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)


class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None


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


class ApprovalHistoryResponse(BaseModel):
    id: str
    job_id: str
    requested_by: Optional[str]
    reviewed_by: Optional[str]
    status: str
    reason: Optional[str]
    created_at: str
    reviewed_at: Optional[str]


# ============================================
# Auth Dependencies - Imported from dependencies.py
# ============================================
# get_current_user, get_user_with_role, verify_hr_or_admin imported from dependencies
# verify_employee_or_admin is defined below as it's specific to jobs

async def verify_employee_or_admin(user: dict = Depends(get_user_with_role)):
    """Verify user is employee or admin."""
    if user["role"] not in ["employee", "admin"]:
        auth_logger.warning(f"Jobs API: Employee access denied for role: {user['role']}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee or Admin privileges required"
        )
    return user


# ============================================
# Endpoints
# ============================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_job(
    job: JobRoleCreate,
    user: dict = Depends(verify_employee_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Create a new job role with pending status."""
    api_logger.info(f"Creating job role: {job.title} by user: {user['id']}")
    
    try:
        # Insert job role
        job_data = {
            "title": job.title,
            "department": job.department,
            "description": job.description,
            "requirements": job.requirements,
            "created_by": user["id"],
            "status": "pending",
            "is_open": True,
            "version": 1  # Initialize version for optimistic locking
        }
        
        result = await supabase.table("job_roles").insert(job_data).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create job role"
            )
        
        job_id = result.data[0]["id"]
        
        # Insert technical questions if any
        if job.technical_questions:
            questions_data = [
                {
                    "job_id": job_id,
                    "question": q.question,
                    "desired_answer": q.desired_answer
                }
                for q in job.technical_questions
            ]
            await supabase.table("technical_assessments").insert(questions_data).execute()
            
        db_logger.info(f"Job role created: {job_id}")
        
        # Create initial approval request
        await supabase.table("approval_requests").insert({
            "job_id": job_id,
            "requested_by": user["id"],
            "status": "pending"
        }).execute()
        
        db_logger.info(f"Approval request created for job: {job_id}")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="create_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job role"
        )


@router.get("")
async def list_jobs(
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """List job roles. Employees see their own, admins see all."""
    api_logger.info(f"Listing jobs for user: {user['id']} (role: {user['role']})")
    
    # Check permissions
    if user["role"] not in ["employee", "admin", "hr"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee, HR, or Admin privileges required"
        )
    
    try:
        query = supabase.table("job_roles").select("*")
        
        # Employees see only their own jobs, admins see all
        if user["role"] == "employee":
            query = query.eq("created_by", user["id"])
        
        result = await query.order("created_at", desc=True).execute()
        
        db_logger.debug(f"Listed {len(result.data)} jobs")
        return result.data or []
        
    except Exception as e:
        log_error(e, context="list_jobs")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch job roles"
        )


@router.get("/pending")
async def list_pending_jobs(
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """List jobs pending approval for HR/Admin review."""
    api_logger.info(f"Listing pending jobs for: {user['id']}")
    
    try:
        result = await supabase.table("job_roles")\
            .select("*")\
            .eq("status", "pending")\
            .order("created_at", desc=True)\
            .execute()
        
        db_logger.debug(f"Found {len(result.data)} pending jobs")
        return result.data or []
        
    except Exception as e:
        log_error(e, context="list_pending_jobs")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pending jobs"
        )


@router.get("/public")
async def list_public_jobs(
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """List approved and open jobs for public viewing (no auth required)."""
    api_logger.info("Fetching public job listings")
    
    try:
        result = await supabase.table("job_roles")\
            .select("id, title, department, description, requirements, created_at")\
            .eq("status", "approved")\
            .eq("is_open", True)\
            .order("created_at", desc=True)\
            .execute()
        
        db_logger.debug(f"Found {len(result.data)} public jobs")
        return result.data or []
        
    except Exception as e:
        log_error(e, context="list_public_jobs")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch job listings"
        )


@router.get("/{job_id}")
async def get_job(
    job_id: str,
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Get job details."""
    api_logger.info(f"Fetching job: {job_id}")
    
    try:
        result = await supabase.table("job_roles")\
            .select("*")\
            .eq("id", job_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        job = result.data
        
        # Check access: owner, hr, admin can see any job; others only approved+open
        if job["created_by"] != user["id"] and user["role"] not in ["hr", "admin"]:
            if job["status"] != "approved" or not job["is_open"]:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Job not found"
                )
        
        # Fetch technical questions
        q_result = await supabase.table("technical_assessments").select("*").eq("job_id", job_id).execute()
        job["technical_questions"] = q_result.data or []

        # Fetch responsibilities
        r_result = await supabase.table("job_responsibilities").select("*").eq("job_id", job_id).execute()
        job["responsibilities"] = r_result.data or []

        # Fetch skills
        s_result = await supabase.table("job_skills").select("*").eq("job_id", job_id).execute()
        job["skills"] = s_result.data or []
            
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="get_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch job"
        )


@router.patch("/{job_id}")
async def update_job(
    job_id: str,
    updates: JobRoleUpdate,
    user: dict = Depends(verify_employee_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Update job details. Resets status to pending if job was approved."""
    api_logger.info(f"Updating job: {job_id} by user: {user['id']}")
    
    try:
        # Fetch existing job
        existing = await supabase.table("job_roles")\
            .select("*")\
            .eq("id", job_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        job = existing.data
        
        # Check permission: owner or admin
        if job["created_by"] != user["id"] and user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this job"
            )
        
        # Build update dict (exclude current_version and technical_questions from update data)
        update_dict = {k: v for k, v in updates.dict().items() if v is not None and k not in ["current_version", "technical_questions"]}
        
        if not update_dict:
            return job
        
        # Optimistic Locking: Check version if provided
        current_version = updates.current_version
        db_version = job.get("version", 1)
        
        if current_version is not None and current_version != db_version:
            api_logger.warning(f"Version conflict for job {job_id}: client={current_version}, db={db_version}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This job has been modified by another user. Please refresh and try again."
            )
        
        # If job was approved, reset to pending (edit-resets-approval)
        was_approved = job["status"] == "approved"
        if was_approved:
            update_dict["status"] = "pending"
            update_dict["approved_by"] = None
            update_dict["approved_at"] = None
            api_logger.info(f"Job {job_id} status reset to pending due to edit")
        
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        update_dict["version"] = db_version + 1  # Increment version
        
        # Conditional update with version check for atomicity
        query = supabase.table("job_roles").update(update_dict).eq("id", job_id)
        if current_version is not None:
            query = query.eq("version", current_version)
        
        result = await query.execute()
        
        # Check if update succeeded (might fail due to race condition)
        if not result.data:
            # Check if job still exists
            check = await supabase.table("job_roles").select("version").eq("id", job_id).single().execute()
            if check.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This job has been modified by another user. Please refresh and try again."
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # If status was reset, create new approval request
        if was_approved:
            await supabase.table("approval_requests").insert({
                "job_id": job_id,
                "requested_by": user["id"],
                "status": "pending",
                "reason": "Re-approval required after edit"
            }).execute()
        
        updated_job = result.data[0] if result.data else job
        
        # Handle technical questions update
        if updates.technical_questions is not None:
            # Delete existing questions
            await supabase.table("technical_assessments").delete().eq("job_id", job_id).execute()
            
            # Insert new questions
            if updates.technical_questions:
                questions_data = [
                    {
                        "job_id": job_id,
                        "question": q.question,
                        "desired_answer": q.desired_answer
                    }
                    for q in updates.technical_questions
                ]
                await supabase.table("technical_assessments").insert(questions_data).execute()
            updated_job["technical_questions"] = updates.technical_questions
            
        db_logger.info(f"Job updated: {job_id} (version: {update_dict.get('version')})")
        return updated_job
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="update_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update job"
        )


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: str,
    user: dict = Depends(verify_employee_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Delete a job role."""
    api_logger.info(f"Deleting job: {job_id} by user: {user['id']}")
    
    try:
        # Fetch existing job
        existing = await supabase.table("job_roles")\
            .select("created_by")\
            .eq("id", job_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        # Check permission: owner or admin
        if existing.data["created_by"] != user["id"] and user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this job"
            )
        
        await supabase.table("job_roles").delete().eq("id", job_id).execute()
        
        db_logger.info(f"Job deleted: {job_id}")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="delete_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete job"
        )


@router.patch("/{job_id}/approve")
async def approve_job(
    job_id: str,
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Approve a pending job role."""
    api_logger.info(f"Approving job: {job_id} by user: {user['id']}")
    
    try:
        # Fetch job
        existing = await supabase.table("job_roles")\
            .select("*")\
            .eq("id", job_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        if existing.data["status"] == "approved":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Job is already approved"
            )
        
        now = datetime.utcnow().isoformat()
        db_version = existing.data.get("version", 1)
        
        # Update job status with version increment
        result = await supabase.table("job_roles")\
            .update({
                "status": "approved",
                "approved_by": user["id"],
                "approved_at": now,
                "rejection_reason": None,
                "version": db_version + 1
            })\
            .eq("id", job_id)\
            .execute()
        
        # Update pending approval request
        await supabase.table("approval_requests")\
            .update({
                "status": "approved",
                "reviewed_by": user["id"],
                "reviewed_at": now
            })\
            .eq("job_id", job_id)\
            .eq("status", "pending")\
            .execute()
        
        db_logger.info(f"Job approved: {job_id}")
        return result.data[0] if result.data else existing.data
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="approve_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve job"
        )


@router.patch("/{job_id}/reject")
async def reject_job(
    job_id: str,
    request: RejectRequest,
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Reject a pending job role with reason."""
    api_logger.info(f"Rejecting job: {job_id} by user: {user['id']}")
    
    try:
        # Fetch job
        existing = await supabase.table("job_roles")\
            .select("*")\
            .eq("id", job_id)\
            .single()\
            .execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        if existing.data["status"] == "rejected":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Job is already rejected"
            )
        
        now = datetime.utcnow().isoformat()
        db_version = existing.data.get("version", 1)
        
        # Update job status with version increment
        result = await supabase.table("job_roles")\
            .update({
                "status": "rejected",
                "rejection_reason": request.reason,
                "approved_by": None,
                "approved_at": None,
                "version": db_version + 1
            })\
            .eq("id", job_id)\
            .execute()
        
        # Update pending approval request
        await supabase.table("approval_requests")\
            .update({
                "status": "rejected",
                "reviewed_by": user["id"],
                "reviewed_at": now,
                "reason": request.reason
            })\
            .eq("job_id", job_id)\
            .eq("status", "pending")\
            .execute()
        
        db_logger.info(f"Job rejected: {job_id} - Reason: {request.reason}")
        return result.data[0] if result.data else existing.data
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="reject_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject job"
        )


@router.patch("/{job_id}/close")
async def close_job(
    job_id: str,
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Close a job (stop accepting applications)."""
    api_logger.info(f"Closing job: {job_id} by user: {user['id']}")
    
    try:
        now = datetime.utcnow().isoformat()
        
        result = await supabase.table("job_roles")\
            .update({
                "is_open": False,
                "closed_at": now
            })\
            .eq("id", job_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        db_logger.info(f"Job closed: {job_id}")
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="close_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to close job"
        )


@router.post("/{job_id}/apply", status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    job_id: str,
    application: ApplicationCreate,
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Submit an application for a job."""
    api_logger.info(f"User {user['id']} applying for job: {job_id}")
    
    try:
        # Verify job exists and is open
        job = await supabase.table("job_roles")\
            .select("status, is_open")\
            .eq("id", job_id)\
            .single()\
            .execute()
        
        if not job.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )
        
        if job.data["status"] != "approved" or not job.data["is_open"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This job is not accepting applications"
            )
        
        # Check for existing application
        existing = await supabase.table("job_applications")\
            .select("id")\
            .eq("job_id", job_id)\
            .eq("applicant_id", user["id"])\
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already applied for this job"
            )
        
        # Create application
        result = await supabase.table("job_applications").insert({
            "job_id": job_id,
            "applicant_id": user["id"],
            "cover_letter": application.cover_letter,
            "resume_url": application.resume_url,
            "phone": application.phone,
            "linkedin_url": application.linkedin_url,
            "status": "submitted"
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit application"
            )
        
        db_logger.info(f"Application submitted: {result.data[0]['id']} for job: {job_id}")
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="apply_for_job")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit application"
        )


@router.get("/{job_id}/applications")
async def list_applications(
    job_id: str,
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """List all applications for a job."""
    api_logger.info(f"Listing applications for job: {job_id}")
    
    try:
        result = await supabase.table("job_applications")\
            .select("*")\
            .eq("job_id", job_id)\
            .order("created_at", desc=True)\
            .execute()
        
        db_logger.debug(f"Found {len(result.data)} applications for job: {job_id}")
        return result.data or []
        
    except Exception as e:
        log_error(e, context="list_applications")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch applications"
        )


@router.get("/{job_id}/approvals")
async def get_approval_history(
    job_id: str,
    user: dict = Depends(verify_hr_or_admin),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Get approval history for a job."""
    api_logger.info(f"Fetching approval history for job: {job_id}")
    
    try:
        result = await supabase.table("approval_requests")\
            .select("*")\
            .eq("job_id", job_id)\
            .order("created_at", desc=True)\
            .execute()
        
        db_logger.debug(f"Found {len(result.data)} approval records for job: {job_id}")
        return result.data or []
        
    except Exception as e:
        log_error(e, context="get_approval_history")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch approval history"
        )
