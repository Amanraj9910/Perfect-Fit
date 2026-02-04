"""
Candidates Router - Candidate Profile Management

Endpoints:
- GET /candidates/me - Get current user's candidate profile
- PUT /candidates/me - Update candidate profile details
- POST /candidates/upload/resume - Upload resume to Azure Blob Storage
- POST /candidates/upload/picture - Upload profile picture to Azure Blob Storage
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
import os
import uuid
from azure.storage.blob.aio import BlobServiceClient
from azure.core.exceptions import ResourceExistsError

from dependencies import get_supabase, CustomSupabaseClient, get_user_with_role
from core.logging import api_logger, db_logger, log_error

router = APIRouter()

# ============================================
# Pydantic Models
# ============================================

class CandidateProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    linkedin_url: Optional[str] = None # Relaxed validation for now
    portfolio_url: Optional[str] = None
    skills: Optional[str] = None # Storing as text for simplicity
    experience_years: Optional[int] = Field(None, ge=0)
    bio: Optional[str] = Field(None, max_length=1000)

class CandidateProfileResponse(BaseModel):
    id: str
    email: Optional[str]
    full_name: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    portfolio_url: Optional[str]
    resume_url: Optional[str]
    profile_pic_url: Optional[str]
    skills: Optional[str]
    experience_years: Optional[int]
    bio: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

# ============================================
# Azure Blob Storage Helper
# ============================================

async def upload_to_azure_blob(file: UploadFile, container_name: str) -> str:
    """Uploads a file to Azure Blob Storage and returns the public URL."""
    connect_str = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not connect_str:
        raise ValueError("AZURE_STORAGE_CONNECTION_STRING not set")

    # Generate unique filename to avoid collisions
    filename = f"{uuid.uuid4()}-{file.filename}"
    
    try:
        blob_service_client = BlobServiceClient.from_connection_string(connect_str)
        async with blob_service_client: # Context manager for async client
            container_client = blob_service_client.get_container_client(container_name)
            
            # Create container if not exists (though user said it exists)
            try:
                await container_client.create_container()
            except ResourceExistsError:
                pass
            except Exception as e:
                # If we rely on public access, container permissions matter.
                # Assuming user set it up correctly or we don't care about creates.
                pass

            blob_client = container_client.get_blob_client(filename)
            file_content = await file.read()
            await blob_client.upload_blob(file_content, overwrite=True)
            
            # Return URL
            return blob_client.url
            
    except Exception as e:
        log_error(e, context="upload_to_azure_blob")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file to storage"
        )
    finally:
        await file.seek(0) # Reset file pointer just in case

# ============================================
# Endpoints
# ============================================

@router.get("/me", response_model=CandidateProfileResponse)
async def get_my_profile(
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Get current user's profile."""
    api_logger.info(f"Fetching profile for user: {user['id']}")
    
    try:
        # Try to get candidate profile
        result = await supabase.table("candidate_profiles").select("*").eq("id", user["id"]).single().execute()
        
        if result.data:
            return result.data
        
        # If not found, create a basic one from auth info?
        # Or return empty/partial?
        # Let's create a default entry if it doesn't exist for better UX
        api_logger.info(f"Creating default candidate profile for: {user['id']}")
        
        new_profile = {
            "id": user["id"],
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "resume_url": None,
            "profile_pic_url": None
        }
        
        insert_result = await supabase.table("candidate_profiles").insert(new_profile).execute()
        
        if insert_result.data:
             return insert_result.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to initialize profile")

    except Exception as e:
        log_error(e, context="get_my_profile")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch profile"
        )

@router.put("/me")
async def update_my_profile(
    updates: CandidateProfileUpdate,
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Update current user's profile information."""
    api_logger.info(f"Updating profile for user: {user['id']}")
    
    try:
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}
        
        # Ensure profile exists first (via upsert or check)
        # Using upsert logic
        update_dict["id"] = user["id"]
        update_dict["email"] = user.get("email") # Ensure email is kept/set
        
        result = await supabase.table("candidate_profiles").upsert(update_dict).execute()
        
        if not result.data:
            # If nothing returned, maybe fetch it
            fetch = await supabase.table("candidate_profiles").select("*").eq("id", user["id"]).single().execute()
            if fetch.data:
                return fetch.data
                
            raise HTTPException(status_code=500, detail="Update failed")
            
        return result.data[0]

    except Exception as e:
        log_error(e, context="update_my_profile")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.post("/upload/resume")
async def upload_resume(
    file: UploadFile = File(...),
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Upload resume to Azure Blob and update profile."""
    api_logger.info(f"Uploading resume for user: {user['id']}")
    
    if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
         raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")

    container = os.environ.get("AZURE_PROFILE_STORAGE_CONTAINER_NAME", "candidate-details")
    
    try:
        file_url = await upload_to_azure_blob(file, container)
        
        # Update profile
        await supabase.table("candidate_profiles").upsert({
            "id": user["id"],
            "resume_url": file_url,
            "email": user.get("email") # Required for upsert if row missing
        }).execute()
        
        return {"url": file_url}
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="upload_resume")
        raise HTTPException(status_code=500, detail="Upload failed")

@router.post("/upload/picture")
async def upload_picture(
    file: UploadFile = File(...),
    user: dict = Depends(get_user_with_role),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Upload profile picture to Azure Blob and update profile."""
    api_logger.info(f"Uploading profile picture for user: {user['id']}")
    
    if not file.content_type.startswith('image/'):
         raise HTTPException(status_code=400, detail="Only image files are allowed")

    container = os.environ.get("AZURE_PROFILE_STORAGE_CONTAINER_NAME", "candidate-details")
    
    try:
        file_url = await upload_to_azure_blob(file, container)
        
        # Update profile
        await supabase.table("candidate_profiles").upsert({
            "id": user["id"],
            "profile_pic_url": file_url,
            "email": user.get("email")
        }).execute()
        
        return {"url": file_url}
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="upload_picture")
        raise HTTPException(status_code=500, detail="Upload failed")
