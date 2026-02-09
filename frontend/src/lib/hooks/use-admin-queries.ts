import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase'
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
    technicalResults: (applicationId?: string) => [...adminQueryKeys.all, 'technicalResults', applicationId || 'all'] as const,
}

export const employeeQueryKeys = {
    all: ['employee'] as const,
    jobs: () => [...employeeQueryKeys.all, 'jobs'] as const,
}

// ============================================
// Types
// ============================================
export interface TechnicalResult {
    id: string
    application_id: string
    question_id: string
    answer: string
    ai_score: number | null
    ai_reasoning: string
    question_text?: string
    candidate_name?: string
    job_title?: string
    created_at?: string
}

export interface GroupedAssessment {
    application_id: string
    candidate_name: string
    job_title: string
    created_at: string
    results: TechnicalResult[]
    average_score: number | null
    status: 'completed' | 'pending'
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

export function useDeleteUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (userId: string) => adminApi.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'users'] })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
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

export function useDeleteAssessment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => adminApi.deleteAssessment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.assessments() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
        },
    })
}

export function useTechnicalResults(applicationId?: string) {
    return useQuery({
        queryKey: adminQueryKeys.technicalResults(applicationId),
        queryFn: async (): Promise<GroupedAssessment[]> => {
            const supabase = getSupabaseClient()
            let query = supabase
                .from('technical_assessment_responses')
                .select(`
                    *,
                    technical_assessments (question),
                    job_applications (
                        applicant_id,
                        created_at,
                        job_roles (title)
                    )
                `)
                .order('created_at', { ascending: false })

            if (applicationId) {
                query = query.eq('application_id', applicationId)
            } else {
                query = query.limit(200)
            }

            const { data, error } = await query

            if (error) throw error
            if (!data) return []

            // Batch fetch all unique applicant IDs to avoid N+1 queries
            const uniqueApplicantIds = Array.from(new Set(
                data
                    .map((item: any) => item.job_applications?.applicant_id)
                    .filter((id: unknown): id is string => Boolean(id))
            ))

            // Single query for all profiles
            let profilesMap: Record<string, string> = {}
            if (uniqueApplicantIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', uniqueApplicantIds)
                if (profiles) {
                    profilesMap = Object.fromEntries(
                        profiles.map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || 'Unknown'])
                    )
                }
            }

            // Enrich data using the pre-fetched profiles map
            const enriched: TechnicalResult[] = data.map((item: any) => {
                const applicantId = item.job_applications?.applicant_id
                const candidateName = applicantId ? (profilesMap[applicantId] || 'Unknown') : 'Unknown'

                return {
                    id: item.id,
                    application_id: item.application_id,
                    question_id: item.question_id,
                    answer: item.answer,
                    ai_score: item.ai_score,
                    ai_reasoning: item.ai_reasoning,
                    question_text: item.technical_assessments?.question,
                    candidate_name: candidateName,
                    job_title: item.job_applications?.job_roles?.title,
                    created_at: item.created_at
                }
            })

            // Group by application_id
            const groups: Record<string, GroupedAssessment> = {}

            enriched.forEach(item => {
                if (!groups[item.application_id]) {
                    groups[item.application_id] = {
                        application_id: item.application_id,
                        candidate_name: item.candidate_name || "Unknown",
                        job_title: item.job_title || "Unknown Job",
                        created_at: item.created_at || "",
                        results: [],
                        average_score: 0,
                        status: 'completed'
                    }
                }
                groups[item.application_id].results.push(item)
            })

            // Calculate stats
            return Object.values(groups).map(g => {
                const totalScore = g.results.reduce((acc, curr) => acc + (curr.ai_score || 0), 0)
                const count = g.results.length
                const hasPending = g.results.some(r => r.ai_score === null || r.ai_score === undefined)

                return {
                    ...g,
                    average_score: count > 0 ? (totalScore / count) : 0,
                    status: hasPending ? 'pending' as const : 'completed' as const
                }
            })
        },
        staleTime: 1000 * 60 * 5
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

export function useDeleteApplication() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => applicationsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.applications() })
            queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() })
            queryClient.invalidateQueries({ queryKey: ['admin', 'technicalResults'] }) // Invalidate technical results too
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
