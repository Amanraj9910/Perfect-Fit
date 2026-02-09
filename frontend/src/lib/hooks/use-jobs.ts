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
            // First try to find in public list to avoid extra request if possible
            // But for correctness and fresh data, we should probably fetch specific
            // However, the current API might only have listPublic or we might need to check how to get single
            // modifying based on existing patterns:

            // Existing pattern in careers/[id]/page.tsx was:
            // const publicJobs = await jobsApi.listPublic()
            // const foundJob = publicJobs.find(j => j.id === jobId)

            // Let's optimize: if we have a direct endpoint, use it. 
            // If not, we fall back to list logic but encapsulated here.

            // Checking api.ts would be ideal, but let's assume we stick to the working logic for now
            // OR better, we can implement a get(id) in api.ts if it doesn't exist.
            // For now, I will replicate the list-and-find logic but specific to this hook
            // unless I see a specific get endpoint in previous context.

            // *Correction*: In previous turns I saw `jobsApi` has `listPublic()`.
            // I will use that for now.

            const publicJobs = await jobsApi.listPublic()
            const foundJob = publicJobs.find(j => j.id === id)
            if (!foundJob) {
                throw new Error('Job not found')
            }
            return foundJob
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
