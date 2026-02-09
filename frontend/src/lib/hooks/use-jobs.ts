import { useQuery } from '@tanstack/react-query'
import { jobsApi, JobRole } from '@/lib/api'

export const jobQueryKeys = {
    all: ['jobs'] as const,
    public: () => [...jobQueryKeys.all, 'public'] as const,
    detail: (id: string) => [...jobQueryKeys.all, 'detail', id] as const,
}

export function usePublicJobs() {
    return useQuery({
        queryKey: jobQueryKeys.public(),
        queryFn: () => jobsApi.listPublic(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function useJob(id: string) {
    return useQuery({
        queryKey: jobQueryKeys.detail(id),
        queryFn: async () => {
            // Use the direct get endpoint for efficiency instead of fetching all jobs
            // This avoids fetching potentially hundreds of jobs just to find one
            return jobsApi.get(id)
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function useAuthenticatedJob(id: string) {
    return useQuery({
        queryKey: [...jobQueryKeys.all, 'authenticated', id],
        queryFn: () => jobsApi.get(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
    })
}
