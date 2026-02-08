import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, applicationsApi, jobsApi, JobRole, JobApplication, JobRoleInput } from '@/lib/api'

// ============================================
// Query Keys - Centralized for cache management
// ============================================
export const adminQueryKeys = {
    all: ['admin'] as const,
    stats: () => [...adminQueryKeys.all, 'stats'] as const,
    users: (page: number, search: string) => [...adminQueryKeys.all, 'users', { page, search }] as const,
    assessments: () => [...adminQueryKeys.all, 'assessments'] as const,
    assessmentDetail: (id: string) => [...adminQueryKeys.all, 'assessments', id] as const,
    applications: () => [...adminQueryKeys.all, 'applications'] as const,
    jobs: () => [...adminQueryKeys.all, 'jobs'] as const,
    pendingJobs: () => [...adminQueryKeys.all, 'jobs', 'pending'] as const,
}

export const employeeQueryKeys = {
    all: ['employee'] as const,
    jobs: () => [...employeeQueryKeys.all, 'jobs'] as const,
}

// ============================================
// Admin Stats Hook
// ============================================
export function useAdminStats() {
    return useQuery({
        queryKey: adminQueryKeys.stats(),
        queryFn: () => adminApi.getStats(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

// ============================================
// Admin Users Hooks
// ============================================
interface UsersResponse {
    users: any[]
    total: number
    page: number
    limit: number
}

export function useAdminUsers(page: number = 1, search: string = '') {
    return useQuery({
        queryKey: adminQueryKeys.users(page, search),
        queryFn: async (): Promise<UsersResponse> => {
            const res = await adminApi.getUsers(page, 10, search)
            return {
                users: res.users || res.data || [],
                total: res.total || 0,
                page: res.page || page,
                limit: res.limit || 10,
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        placeholderData: (previousData) => previousData, // Keep showing previous data while fetching new page
    })
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) =>
            adminApi.updateUserRole(userId, role),
        onSuccess: () => {
            // Invalidate all user queries to refetch
            queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'users'] })
        },
    })
}

// ============================================
// Admin Assessments Hooks
// ============================================
export function useAdminAssessments(limit: number = 20) {
    return useQuery({
        queryKey: adminQueryKeys.assessments(),
        queryFn: () => adminApi.getAssessments(limit),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function useAdminAssessmentDetail(id: string) {
    return useQuery({
        queryKey: adminQueryKeys.assessmentDetail(id),
        queryFn: () => adminApi.getAssessmentDetail(id),
        enabled: !!id, // Only fetch if id is provided
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

// ============================================
// Admin Applications Hooks
// ============================================
export function useAdminApplications() {
    return useQuery({
        queryKey: adminQueryKeys.applications(),
        queryFn: () => applicationsApi.listAll(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function useUpdateApplicationStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, status, feedback }: { id: string; status: string; feedback?: string }) =>
            applicationsApi.updateStatus(id, status, feedback),
        onSuccess: () => {
            // Invalidate applications to refetch updated data
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.applications() })
            // Also invalidate stats since application counts may change
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
        },
    })
}

// ============================================
// Admin Jobs Hooks
// ============================================
export function useAdminJobs() {
    return useQuery({
        queryKey: adminQueryKeys.jobs(),
        queryFn: () => jobsApi.list(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function usePendingJobs() {
    return useQuery({
        queryKey: adminQueryKeys.pendingJobs(),
        queryFn: () => jobsApi.listPending(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function useApproveJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (jobId: string) => jobsApi.approve(jobId),
        onSuccess: () => {
            // Invalidate both jobs and pending jobs
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingJobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
        },
    })
}

export function useRejectJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ jobId, reason }: { jobId: string; reason: string }) =>
            jobsApi.reject(jobId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingJobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
        },
    })
}

export function useCloseJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (jobId: string) => jobsApi.close(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingJobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
        },
    })
}

// ============================================
// Employee Jobs Hooks
// ============================================
export function useEmployeeJobs() {
    return useQuery({
        queryKey: employeeQueryKeys.jobs(),
        queryFn: () => jobsApi.list(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

export function useCreateJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: JobRoleInput) =>
            jobsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingJobs() })
        },
    })
}

export function useUpdateJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<JobRole> }) =>
            jobsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingJobs() })
        },
    })
}

export function useDeleteJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => jobsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: employeeQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.jobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingJobs() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
        },
    })
}
