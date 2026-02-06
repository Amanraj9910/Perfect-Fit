import os
import jwt
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

from pathlib import Path

# Load environment variables (robust absolute path)
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Initialize Supabase Client once
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Supabase URL and Service Role Key must be set in .env")

# Use our custom client instead of the official 'supabase' package
supabase = CustomSupabaseClient(url, key)

# JWT Configuration for local verification
JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
SUPABASE_ALGORITHM = "HS256"

if not JWT_SECRET:
    auth_logger.warning("SUPABASE_JWT_SECRET not set - falling back to API verification")

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
        return {
            "id": str(user_id),
            "email": user_response.user.email,
            "role": profile.data.get("role")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, context="verify_admin")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )

from fastapi import Depends

class LocalUser:
    """Simple user object for locally verified tokens."""
    def __init__(self, id: str, email: str = None, role: str = None):
        self.id = id
        self.email = email
        self.role = role

async def get_current_user(x_supabase_auth: str = Header(None)):
    """
    Get current authenticated user without role check.
    Uses local JWT verification for improved latency (~200ms saved per request).
    Falls back to Supabase API if JWT_SECRET is not configured.
    """
    if not x_supabase_auth:
        auth_logger.warning("Auth attempt without token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Auth Token"
        )
    
    # Try local verification first (faster)
    if JWT_SECRET:
        try:
            payload = jwt.decode(
                x_supabase_auth,
                JWT_SECRET,
                algorithms=[SUPABASE_ALGORITHM],
                audience="authenticated"
            )
            user_id = payload.get("sub")
            email = payload.get("email")
            
            if not user_id:
                raise jwt.InvalidTokenError("Missing 'sub' claim")
            
            auth_logger.debug(f"Local JWT verification success for user: {user_id}")
            return LocalUser(id=user_id, email=email)
            
        except jwt.ExpiredSignatureError:
            auth_logger.warning("Token expired (local verification)")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        except jwt.InvalidTokenError as e:
            # Local verification failed - fall through to API verification
            auth_logger.debug(f"Local JWT failed, trying API fallback: {e}")
    
    # Fallback to Supabase API verification
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


