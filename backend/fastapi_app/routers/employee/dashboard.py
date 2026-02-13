from fastapi import APIRouter, Depends, HTTPException, status
from dependencies import get_supabase, CustomSupabaseClient, get_user_with_role
from core.logging import api_logger, log_error

router = APIRouter()

async def verify_employee(user: dict = Depends(get_user_with_role)):
    """Verify user is employee or admin."""
    if user["role"] not in ["employee", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee privileges required"
        )
    return user

@router.get("/stats")
async def get_dashboard_stats(
    user: dict = Depends(verify_employee),
    supabase: CustomSupabaseClient = Depends(get_supabase)
):
    """Get statistics for the employee dashboard."""
    try:
        # Helper function to get job counts by status
        # REMOVED head=True parameter - it's not supported in this version
        async def get_count(status_filter=None, is_open=None):
            """Get count of jobs with optional filters."""
            query = supabase.table("job_roles")\
                .select("id", count="exact")\
                .eq("created_by", user["id"])
            
            if status_filter:
                query = query.eq("status", status_filter)
            if is_open is not None:
                query = query.eq("is_open", is_open)
            
            res = await query.execute()
            return res.count if res.count is not None else 0

        # Get all job statistics
        total = await get_count()
        pending = await get_count(status_filter="pending")
        approved = await get_count(status_filter="approved")
        rejected = await get_count(status_filter="rejected")
        closed = await get_count(is_open=False)
        
        # Fetch recent activity for user's jobs
        jobs_res = await supabase.table("job_roles")\
            .select("id")\
            .eq("created_by", user["id"])\
            .execute()
        
        job_ids = [j["id"] for j in jobs_res.data] if jobs_res.data else []
        
        recent_activity = []
        if job_ids:
            try:
                # Use created_at since updated_at doesn't exist
                recent_activity_res = await supabase.table("approval_requests")\
                    .select("*, job_roles(title)")\
                    .in_("job_id", job_ids)\
                    .order("created_at", desc=True)\
                    .limit(5)\
                    .execute()
                recent_activity = recent_activity_res.data if recent_activity_res.data else []
                
            except Exception as activity_err:
                # If fetching activity fails, just log and continue
                log_error(activity_err, context="get_dashboard_stats_activity")
                api_logger.error(f"Failed to fetch recent activity: {activity_err}")

        return {
            "total_jobs": total,
            "pending_jobs": pending,
            "approved_jobs": approved,
            "rejected_jobs": rejected,
            "closed_jobs": closed,
            "recent_activity": recent_activity
        }

    except HTTPException:
        # Re-raise HTTP exceptions (like 403)
        raise
    except Exception as e:
        # Catch-all for unexpected errors
        log_error(e, context="get_dashboard_stats")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard statistics"
        )