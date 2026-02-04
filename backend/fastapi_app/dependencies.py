import os
from fastapi import Header, HTTPException, status
from gotrue import AsyncGoTrueClient
from postgrest import AsyncPostgrestClient

from core.logging import auth_logger, db_logger, log_error

# Custom Client to avoid 'supafunc'/'pyroaring' dependency issues on Windows
class CustomSupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        
        # Initialize Auth (GoTrue)
        self.auth = AsyncGoTrueClient(
            url=f"{url}/auth/v1",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}"
            }
        )
        
        # Initialize DB (PostgREST)
        self.postgrest = AsyncPostgrestClient(
            base_url=f"{url}/rest/v1",
            headers=self.headers
        )

    def table(self, table_name: str):
        return self.postgrest.from_(table_name)

from dotenv import load_dotenv

# Load environment variables (ensure .env is loaded even if main.py hasn't run yet)
load_dotenv(dotenv_path="../../.env")

# Initialize Supabase Client once
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Supabase URL and Service Role Key must be set in .env")

# Use our custom client instead of the official 'supabase' package
supabase = CustomSupabaseClient(url, key)

def get_supabase():
    return supabase

async def verify_admin(x_supabase_auth: str = Header(None)):
    """
    Verifies that the request comes from an authenticated admin or hr user.
    """
    if not x_supabase_auth:
        auth_logger.warning("Auth attempt without token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Auth Token",
        )
    
    try:
        # Check if the token is valid and get user
        # gotrue-py get_user takes just the jwt
        user_response = await supabase.auth.get_user(x_supabase_auth)
        
        # The structure of user_response might differ slightly in direct gotrue usage vs supabase wrapper
        # SyncGoTrueClient.get_user returns a UserResponse object usually
        
        if not user_response or not user_response.user:
            auth_logger.warning("Auth attempt with invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Token",
            )
            
        user_id = user_response.user.id
        auth_logger.debug(f"Token validated for user: {user_id}")
        
        # Check role in profiles table
        profile = await supabase.table("profiles").select("role").eq("id", user_id).single().execute()
        
        if not profile.data or profile.data.get("role") not in ["admin", "hr"]:
            auth_logger.warning(f"Access denied - insufficient privileges for user: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin or HR privileges required",
            )
        
        auth_logger.info(f"Admin access granted for user: {user_id} (role: {profile.data.get('role')})")
        return user_response.user
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="verify_admin")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

from fastapi import Depends

async def get_current_user(x_supabase_auth: str = Header(None)):
    """Get current authenticated user without role check."""
    if not x_supabase_auth:
        auth_logger.warning("Auth attempt without token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Auth Token"
        )
    
    try:
        user_response = await supabase.auth.get_user(x_supabase_auth)
        if not user_response or not user_response.user:
            auth_logger.warning("Invalid token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Token"
            )
        
        return user_response.user
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="get_current_user")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

async def get_user_with_role(user = Depends(get_current_user)):
    """Get current user with their role from profiles table."""
    try:
        profile = await supabase.table("profiles").select("role, full_name, email").eq("id", str(user.id)).single().execute()
        
        # If no profile, they might be a new candidate. Default to 'candidate' if not found?
        # Or better, create a basic profile? For now, just return what we have or error.
        # But wait, we want to allow new users to be candidates.
        
        role = "candidate"
        full_name = None
        email = None
        
        if profile.data:
            role = profile.data.get("role", "candidate")
            full_name = profile.data.get("full_name")
            email = profile.data.get("email")
        
        return {
            "id": str(user.id),
            "role": role,
            "full_name": full_name,
            "email": email
        }
    except Exception as e:
        log_error(e, context="get_user_with_role")
        # Proceed as candidate if error looking up profile (fail-safe for new users)
        return {
            "id": str(user.id),
            "role": "candidate",
            "full_name": None,
            "email": None
        }

# Alias for backward compatibility or clearer intent
# Since verify_admin already checks for ["admin", "hr"], we can reuse it.
verify_hr_or_admin = verify_admin


