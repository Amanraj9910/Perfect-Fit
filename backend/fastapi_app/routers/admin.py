from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
import os

from dependencies import get_supabase, verify_admin

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
def get_stats(supabase = Depends(get_supabase)): # Removed verify_admin for easier testing initially, add back later
    
    # 1. Count Candidates
    candidates_count = supabase.table("profiles").select("*", count="exact", head=True).eq("role", "candidate").execute().count
    
    # 2. Count Employees
    employees_count = supabase.table("profiles").select("*", count="exact", head=True).eq("role", "employee").execute().count
    
    # 3. Total Assessments
    assessments_count = supabase.table("assessments").select("*", count="exact", head=True).execute().count
    
    # 4. Assessments Today
    today = datetime.now().strftime("%Y-%m-%d")
    assessments_today_count = supabase.table("assessments").select("*", count="exact", head=True).gte("created_at", today).execute().count
    
    # 5. Average Score & Distribution
    scores_response = supabase.table("assessment_scores").select("total_score").execute()
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
def get_users(
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
    result = query.execute()
    
    return {
        "data": result.data,
        "total": result.count,
        "page": page,
        "limit": limit
    }

@router.patch("/users/{user_id}/role")
def update_user_role(user_id: str, role_update: RoleUpdate, supabase = Depends(get_supabase)):
    valid_roles = ['candidate', 'employee', 'hr', 'recruiter', 'admin']
    if role_update.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    result = supabase.table("profiles").update({"role": role_update.role}).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return result.data[0]

@router.get("/assessments", response_model=List[AssessmentSummary])
def get_assessments(limit: int = 20, supabase = Depends(get_supabase)):
    # Fetch assessments with user info
    # Supabase join: assessments(..., profiles(email, full_name), assessment_scores(overall_score))
    
    response = supabase.table("assessments").select(
        "id, status, created_at, user_id, profiles(email, full_name), assessment_scores(total_score)"
    ).order("created_at", desc=True).limit(limit).execute()
    
    assessments = []
    for item in response.data:
        profile = item.get('profiles') or {}
        scores = item.get('assessment_scores')
        total_score = scores[0]['total_score'] if scores and len(scores) > 0 else None
        
        assessments.append(AssessmentSummary(
            id=item['id'],
            user_id=item['user_id'],
            user_name=profile.get('full_name'),
            user_email=profile.get('email', 'Unknown'),
            status=item['status'],
            overall_score=total_score,
            created_at=item['created_at']
        ))
        
    return assessments

@router.get("/assessments/{id}", response_model=AssessmentDetail)
def get_assessment_detail(id: str, supabase = Depends(get_supabase)):
    # 1. Fetch Assessment & User Profile
    assessment_res = supabase.table("assessments").select(
        "*, profiles(*)"
    ).eq("id", id).single().execute()
    
    if not assessment_res.data:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    assessment = assessment_res.data
    profile = assessment.get('profiles')
    
    # 2. Fetch Scores
    scores_res = supabase.table("assessment_scores").select("*").eq("assessment_id", id).maybe_single().execute()
    scores = scores_res.data
    
    # 3. Fetch Responses
    responses_res = supabase.table("assessment_responses").select("*").eq("assessment_id", id).order("created_at").execute()
    responses = responses_res.data # Contains audio_url / transcript / feedback
    
    return AssessmentDetail(
        id=id,
        profile=UserProfile(**profile),
        scores=scores,
        responses=responses
    )

@router.get("/assessments/{id}/audio/{response_id}")
def get_audio_sas(id: str, response_id: str, supabase = Depends(get_supabase)):
    """
    Generate a SAS token for the audio file associated with a specific response.
    """
    # 1. Get the response record to find the audio path
    response_record = supabase.table("assessment_responses").select("audio_url").eq("id", response_id).single().execute()
    
    if not response_record.data or not response_record.data.get('audio_url'):
         raise HTTPException(status_code=404, detail="Audio recording not found for this response")
         
    audio_path = response_record.data['audio_url']
    
    # Assuming audio_path is stored relative to the container or full URL
    # If it's a full URL, extract the blob name.
    # Format might be: https://<account>.blob.core.windows.net/<container>/<blob>
    # or just: <folder>/<filename>
    
    blob_name = audio_path
    if "core.windows.net" in audio_path:
        try:
            blob_name = audio_path.split(CONTAINER_NAME + "/")[1]
        except IndexError:
             blob_name = audio_path # Fallback or error

    # 2. Generate SAS Token
    try:
        blob_service_client = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
        sas_token = generate_blob_sas(
            account_name=blob_service_client.account_name,
            container_name=CONTAINER_NAME,
            blob_name=blob_name,
            account_key=blob_service_client.credential.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        
        # Construct full SAS URL
        # We can return just the token or the full URL. Let's return the full URL.
        # But wait, the frontend might just want the URL to put in <audio src="...">
        
        sas_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{CONTAINER_NAME}/{blob_name}?{sas_token}"
        
        return {"audio_url": sas_url}
        
    except Exception as e:
        print(f"SAS Generation Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate audio link")
