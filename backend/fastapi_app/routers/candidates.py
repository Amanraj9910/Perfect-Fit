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

from datetime import datetime, timedelta
from azure.storage.blob import generate_blob_sas, BlobSasPermissions

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


# ============================================
# Azure Blob Storage Helper
# ============================================

def get_blob_service_client():
    connect_str = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not connect_str:
        raise ValueError("AZURE_STORAGE_CONNECTION_STRING not set")
    return BlobServiceClient.from_connection_string(connect_str)

def sign_blob_url(blob_url: str) -> str:
    """
    Appends a SAS token to the blob URL to allow secure read access.
    """
    if not blob_url:
        return blob_url
        
    try:
        connect_str = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
        if not connect_str:
            api_logger.warning("AZURE_STORAGE_CONNECTION_STRING not set, cannot sign URL")
            return blob_url

        # Parse connection string to get account name and key
        params = dict(item.split('=', 1) for item in connect_str.split(';') if '=' in item)
        account_name = params.get('AccountName')
        account_key = params.get('AccountKey')

        if not account_name or not account_key:
             api_logger.warning("Could not parse AccountName or AccountKey from connection string")
             return blob_url

        # Extract container and blob name from URL
        try:
            from urllib.parse import urlparse
            parsed = urlparse(blob_url)
            path_parts = parsed.path.lstrip('/').split('/', 1)
            if len(path_parts) != 2:
                return blob_url
            
            container_name, blob_name = path_parts
        except Exception:
            return blob_url

        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(hours=1)
        )
        
        return f"{blob_url}?{sas_token}"
        
    except Exception as e:
        log_error(e, context="sign_blob_url")
        return blob_url

async def delete_blob_from_url(blob_url: str):
    """Deletes a blob given its full URL."""
    if not blob_url:
        return

    try:
        from urllib.parse import urlparse
        parsed = urlparse(blob_url)
        path_parts = parsed.path.lstrip('/').split('/', 1)
        if len(path_parts) != 2:
            return
        
        container_name, blob_name = path_parts
        
        # We need to handle potential SAS tokens in the URL if passed back? 
        # But usually we store the clean URL in DB. 
        # Check if query params exist and strip them just in case.
        if '?' in blob_name:
            blob_name = blob_name.split('?')[0]

        blob_service_client = get_blob_service_client()
        async with blob_service_client:
            container_client = blob_service_client.get_container_client(container_name)
            blob_client = container_client.get_blob_client(blob_name)
            await blob_client.delete_blob()
            api_logger.info(f"Deleted old blob: {blob_name}")
            
    except Exception as e:
        # Log but don't fail the request if deletion fails
        log_error(e, context="delete_blob_from_url")

async def upload_to_azure_blob(file: UploadFile, container_name: str) -> str:
    """Uploads a file to Azure Blob Storage and returns the public URL."""
    # Generate unique filename
    filename = f"{uuid.uuid4()}-{file.filename}"
    
    try:
        blob_service_client = get_blob_service_client()
        async with blob_service_client:
            container_client = blob_service_client.get_container_client(container_name)
            
            try:
                await container_client.create_container()
            except ResourceExistsError:
                pass
            except Exception:
                pass

            blob_client = container_client.get_blob_client(filename)
            file_content = await file.read()
            await blob_client.upload_blob(file_content, overwrite=True)
            
            return blob_client.url
            
    except Exception as e:
        log_error(e, context="upload_to_azure_blob")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file to storage"
        )
    finally:
        await file.seek(0)

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
        result = await supabase.table("candidate_profiles").select("*").eq("id", user["id"]).single().execute()
        
        if result.data:
            profile = result.data
            # Sign the URLs before returning
            if profile.get('resume_url'):
                profile['resume_url'] = sign_blob_url(profile['resume_url'])
            if profile.get('profile_pic_url'):
                profile['profile_pic_url'] = sign_blob_url(profile['profile_pic_url'])
            return profile
        
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
        
        update_dict["id"] = user["id"]
        update_dict["email"] = user.get("email")
        
        result = await supabase.table("candidate_profiles").upsert(update_dict).execute()
        
        if not result.data:
            fetch = await supabase.table("candidate_profiles").select("*").eq("id", user["id"]).single().execute()
            if fetch.data:
                profile = fetch.data
                if profile.get('resume_url'):
                    profile['resume_url'] = sign_blob_url(profile['resume_url'])
                if profile.get('profile_pic_url'):
                    profile['profile_pic_url'] = sign_blob_url(profile['profile_pic_url'])
                return profile
                
            raise HTTPException(status_code=500, detail="Update failed")
            
        profile = result.data[0]
        if profile.get('resume_url'):
            profile['resume_url'] = sign_blob_url(profile['resume_url'])
        if profile.get('profile_pic_url'):
            profile['profile_pic_url'] = sign_blob_url(profile['profile_pic_url'])
        return profile

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
        # Check for existing resume to delete? 
        # Optional enhancement: delete old resume
        current = await supabase.table("candidate_profiles").select("resume_url").eq("id", user["id"]).single().execute()
        if current.data and current.data.get("resume_url"):
            await delete_blob_from_url(current.data["resume_url"])

        file_url = await upload_to_azure_blob(file, container)
        
        await supabase.table("candidate_profiles").upsert({
            "id": user["id"],
            "resume_url": file_url,
            "email": user.get("email")
        }).execute()
        
        return {"url": sign_blob_url(file_url)}
        
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
        # 1. Fetch current profile to get old picture URL
        current = await supabase.table("candidate_profiles").select("profile_pic_url").eq("id", user["id"]).single().execute()
        
        # 2. Delete old blob if it exists
        if current.data and current.data.get("profile_pic_url"):
            await delete_blob_from_url(current.data["profile_pic_url"])

        # 3. Upload new blob
        file_url = await upload_to_azure_blob(file, container)
        
        # 4. Update 'candidate_profiles'
        await supabase.table("candidate_profiles").upsert({
            "id": user["id"],
            "profile_pic_url": file_url,
            "email": user.get("email")
        }).execute()

        # 5. Update 'profiles' table (Auth/Navbar sync)
        # Note: profiles table uses 'avatar_url'
        await supabase.table("profiles").update({
            "avatar_url": file_url
        }).eq("id", user["id"]).execute()
        
        return {"url": sign_blob_url(file_url)}
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="upload_picture")
        raise HTTPException(status_code=500, detail="Upload failed")
