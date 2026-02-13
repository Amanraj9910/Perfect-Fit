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
        # We need counts of jobs by status
        # Since Supabase postgrest-py aggregation is limited, we fetch and count or use count queries.
        # Fetching all might be heavy if many jobs, but efficient enough for now. 
        # Better: use select with count="exact" and filters.
        
        async def get_count(status_filter=None, is_open=None):
            query = supabase.table("job_roles").select("*", count="exact", head=True).eq("created_by", user["id"])
            if status_filter:
                query = query.eq("status", status_filter)
            if is_open is not None:
                query = query.eq("is_open", is_open)
            res = await query.execute()
            return res.count

        total = await get_count()
        pending = await get_count(status_filter="pending")
        approved = await get_count(status_filter="approved")
        rejected = await get_count(status_filter="rejected")
        closed = await get_count(is_open=False)
        
        # Recent approvals (approved in last 7 days? - logic can be complex via API, simple fetch for now)
        # Fetch jobs created by user first to avoid complex join filtering issues
        jobs_res = await supabase.table("job_roles").select("id").eq("created_by", user["id"]).execute()
        job_ids = [j["id"] for j in jobs_res.data]
        
        recent_activity = []
        if job_ids:
            # FIXED: Changed from 'updated_at' to 'created_at' based on database schema
            recent_activity_res = await supabase.table("approval_requests")\
                .select("*, job_roles(title)")\
                .in_("job_id", job_ids)\
                .order("created_at", desc=True)\
                .limit(5)\
                .execute()
            recent_activity = recent_activity_res.data

        return {
            "total_jobs": total,
            "pending_jobs": pending,
            "approved_jobs": approved,
            "rejected_jobs": rejected,
            "closed_jobs": closed,
            "recent_activity": recent_activity
        }

    except Exception as e:
        log_error(e, context="get_dashboard_stats")
        raise HTTPException(status_code=500, detail="Failed to fetch stats")