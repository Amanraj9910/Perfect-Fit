from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
import os

from dependencies import get_supabase, verify_admin
from core.logging import api_logger, db_logger, error_logger, log_error

router = APIRouter()

# Azure Blob Storage Config
AZURE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
CONTAINER_NAME = os.environ.get("AZURE_STORAGE_CONTAINER_NAME")

# --- Pydantic Models ---

class UserStats(BaseModel):
    total_candidates: int
    total_employees: int
    total_assessments: int
    assessments_today: int
    average_score: float
    score_distribution: List[dict]

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    created_at: str

class AssessmentSummary(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str]
    user_email: str
    status: str
    overall_score: Optional[float]
    created_at: str

class AssessmentDetail(BaseModel):
    id: str
    profile: UserProfile
    scores: Optional[dict]
    responses: List[dict]

class RoleUpdate(BaseModel):
    role: str

# --- Endpoints ---

@router.get("/stats", response_model=UserStats)
async def get_stats(supabase = Depends(get_supabase)): # Removed verify_admin for easier testing initially, add back later
    api_logger.info("Fetching admin stats")
    
    # 1. Count Candidates
    candidates_count = (await supabase.table("profiles").select("*", count="exact", head=True).eq("role", "candidate").execute()).count
    
    # 2. Count Employees
    employees_count = (await supabase.table("profiles").select("*", count="exact", head=True).eq("role", "employee").execute()).count
    
    # 3. Total Assessments
    assessments_count = (await supabase.table("assessments").select("*", count="exact", head=True).execute()).count
    
    # 4. Assessments Today
    today = datetime.now().strftime("%Y-%m-%d")
    assessments_today_count = (await supabase.table("assessments").select("*", count="exact", head=True).gte("created_at", today).execute()).count
    
    # 5. Average Score & Distribution
    scores_response = await supabase.table("assessment_scores").select("total_score").execute()
    scores = [s['total_score'] for s in scores_response.data if s['total_score'] is not None]
    
    avg_score = sum(scores) / len(scores) if scores else 0.0

    # Calculate Distribution
    distribution = {
        "0-20%": 0,
        "20-40%": 0,
        "40-60%": 0,
        "60-80%": 0,
        "80-100%": 0
    }
    
    for score in scores:
        if score <= 20: distribution["0-20%"] += 1
        elif score <= 40: distribution["20-40%"] += 1
        elif score <= 60: distribution["40-60%"] += 1
        elif score <= 80: distribution["60-80%"] += 1
        else: distribution["80-100%"] += 1

    return UserStats(
        total_candidates=candidates_count or 0,
        total_employees=employees_count or 0,
        total_assessments=assessments_count or 0,
        assessments_today=assessments_today_count or 0,
        average_score=round(avg_score, 1),
        score_distribution=[{"name": k, "count": v} for k, v in distribution.items()]
    )

@router.get("/users", response_model=dict)
async def get_users(
    page: int = 1, 
    limit: int = 10, 
    search: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    start = (page - 1) * limit
    end = start + limit - 1
    
    query = supabase.table("profiles").select("*", count="exact")
    
    if search:
        # Search by email or full_name
        query = query.or_(f"email.ilike.%{search}%,full_name.ilike.%{search}%")
        
    query = query.order("created_at", desc=True).range(start, end)
    result = await query.execute()
    
    return {
        "data": result.data,
        "total": result.count,
        "page": page,
        "limit": limit
    }

@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, role_update: RoleUpdate, supabase = Depends(get_supabase)):
    valid_roles = ['candidate', 'employee', 'hr', 'recruiter', 'admin']
    if role_update.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    result = await supabase.table("profiles").update({"role": role_update.role}).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return result.data[0]

@router.get("/assessments", response_model=List[AssessmentSummary])
async def get_assessments(limit: int = 20, supabase = Depends(get_supabase)):
    api_logger.info(f"Fetching assessments (limit={limit})")
    # Fetch assessments with user info
    # Supabase join: assessments(..., profiles(email, full_name), assessment_scores(overall_score))
    
    try:
        response = await supabase.table("assessments").select(
            "id, status, created_at, user_id, profiles(email, full_name), assessment_scores(total_score)"
        ).order("created_at", desc=True).limit(limit).execute()
        
        db_logger.debug(f"Fetched {len(response.data)} assessments from database")
    
        assessments = []
        for item in response.data:
            profile = item.get('profiles') or {}
            scores_data = item.get('assessment_scores')
            
            total_score = None
            if isinstance(scores_data, list) and len(scores_data) > 0:
                total_score = scores_data[0].get('total_score')
            elif isinstance(scores_data, dict):
                total_score = scores_data.get('total_score')

            assessments.append(AssessmentSummary(
                id=item['id'],
                user_id=item['user_id'],
                user_name=profile.get('full_name'),
                user_email=profile.get('email', 'Unknown'),
                status=item['status'],
                overall_score=total_score,
                created_at=item['created_at']
            ))
        
        api_logger.info(f"Returning {len(assessments)} assessments")
        return assessments
        
    except Exception as e:
        log_error(e, context="get_assessments")
        raise HTTPException(status_code=500, detail="Failed to fetch assessments")


@router.get("/assessments/{id}", response_model=AssessmentDetail)
async def get_assessment_detail(id: str, supabase = Depends(get_supabase)):
    # 1. Fetch Assessment & User Profile
    assessment_res = await supabase.table("assessments").select(
        "*, profiles(*)"
    ).eq("id", id).single().execute()
    
    if not assessment_res.data:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    assessment = assessment_res.data
    profile = assessment.get('profiles')
    
    # 2. Fetch Scores
    scores_res = await supabase.table("assessment_scores").select("*").eq("assessment_id", id).maybe_single().execute()
    scores = scores_res.data
    
    # 3. Fetch Responses
    responses_res = await supabase.table("assessment_responses").select("*").eq("assessment_id", id).order("created_at").execute()
    responses = responses_res.data # Contains audio_url / transcript / feedback
    
    return AssessmentDetail(
        id=id,
        profile=UserProfile(**profile),
        scores=scores,
        responses=responses
    )

@router.get("/assessments/{id}/audio/{response_id}")
async def get_audio_sas(id: str, response_id: str, supabase = Depends(get_supabase)):
    """
    Generate a fresh SAS token for the audio file associated with a specific response.
    """
    from urllib.parse import unquote
    
    api_logger.info(f"Fetching audio SAS for assessment={id}, response={response_id}")
    
    # 1. Get the response record to find the audio path
    try:
        response_record = await supabase.table("assessment_responses").select("audio_url, section").eq("id", response_id).single().execute()
    except Exception as e:
        api_logger.error(f"Database error fetching response: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    
    if not response_record.data or not response_record.data.get('audio_url'):
        api_logger.warning(f"No audio_url found for response {response_id}")
        raise HTTPException(status_code=404, detail="Audio recording not found for this response")
         
    saved_url = response_record.data['audio_url']
    section = response_record.data.get('section', 'unknown')
    api_logger.debug(f"Found audio URL for section '{section}': {saved_url[:80]}...")
    
    # 2. Parse blob name from stored URL
    # URL format: https://<account>.blob.core.windows.net/<container>/<blob_path>?<sas_token>
    blob_name = saved_url
    
    try:
        if "core.windows.net" in saved_url:
            # Extract path after container name
            container_part = f"/{CONTAINER_NAME}/"
            if container_part in saved_url:
                file_part = saved_url.split(container_part)[-1]
            else:
                # Try alternative container format (without leading slash)
                file_part = saved_url.split(f"{CONTAINER_NAME}/")[-1]
            
            # Remove SAS token query params
            blob_name = file_part.split("?")[0]
            
            # Decode URL encoding (e.g., %20 -> space)
            blob_name = unquote(blob_name)
        
        api_logger.debug(f"Parsed blob name: {blob_name}")
        
    except Exception as e:
        api_logger.error(f"Failed to parse blob name from URL: {e}")
        raise HTTPException(status_code=500, detail="Invalid audio record format")
    
    # 3. Verify blob exists (optional but recommended)
    try:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
        blob_client = blob_service_client.get_blob_client(container=CONTAINER_NAME, blob=blob_name)
        
        if not blob_client.exists():
            api_logger.warning(f"Blob does not exist: {blob_name}")
            raise HTTPException(status_code=404, detail="Audio file not found in storage")
            
    except HTTPException:
        raise
    except Exception as e:
        api_logger.warning(f"Could not verify blob existence: {e}")
        # Continue anyway - let it fail at playback if blob doesn't exist

    # 4. Generate fresh SAS Token
    try:
        sas_token = generate_blob_sas(
            account_name=blob_service_client.account_name,
            container_name=CONTAINER_NAME,
            blob_name=blob_name,
            account_key=blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        
        # Construct full SAS URL
        sas_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{CONTAINER_NAME}/{blob_name}?{sas_token}"
        
        api_logger.info(f"Generated SAS URL for {section} (expires in 1 hour)")
        return {"audio_url": sas_url, "section": section}
        
    except Exception as e:
        api_logger.error(f"SAS Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate audio link")

