import { getSupabaseClient } from './supabase'
import { apiLogger, logApiRequest, logApiResponse, logApiError } from './logger'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Generic fetch wrapper with Auth and Logging
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const startTime = performance.now()
    const method = options.method || 'GET'
    const url = `${API_BASE_URL}${endpoint}`

    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    const token = session?.access_token

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-supabase-auth': token } : {}),
        ...options.headers,
    }

    // Log request
    logApiRequest(method, endpoint, options.body ? JSON.parse(options.body as string) : undefined)

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        })

        const durationMs = performance.now() - startTime

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}))
            logApiError(method, endpoint, `HTTP ${response.status}`, errorBody)
            throw new Error(errorBody.detail || `API Error: ${response.statusText}`)
        }

        const data = await response.json()
        logApiResponse(method, endpoint, response.status, durationMs)

        return data
    } catch (error) {
        const durationMs = performance.now() - startTime
        if (error instanceof Error) {
            logApiError(method, endpoint, error)
        }
        throw error
    }
}

// Fetch without auth for public endpoints
async function fetchPublic(endpoint: string) {
    const startTime = performance.now()
    const url = `${API_BASE_URL}${endpoint}`

    logApiRequest('GET', endpoint)

    try {
        const response = await fetch(url)
        const durationMs = performance.now() - startTime

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}))
            logApiError('GET', endpoint, `HTTP ${response.status}`, errorBody)
            throw new Error(errorBody.detail || `API Error: ${response.statusText}`)
        }

        const data = await response.json()
        logApiResponse('GET', endpoint, response.status, durationMs)

        return data
    } catch (error) {
        if (error instanceof Error) {
            logApiError('GET', endpoint, error)
        }
        throw error
    }
}

export const adminApi = {
    getStats: () => fetchWithAuth('/admin/stats'),

    getUsers: (page = 1, limit = 10, search = '') => {
        const query = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(search ? { search } : {})
        })
        return fetchWithAuth(`/admin/users?${query}`)
    },

    updateUserRole: (userId: string, role: string) =>
        fetchWithAuth(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        }),

    // FIXED: Ensure getAssessments always returns an array
    getAssessments: async (limit = 20) => {
        try {
            const response = await fetchWithAuth(`/admin/assessments?limit=${limit}`)

            // Validate response is an array (direct list)
            if (Array.isArray(response)) {
                apiLogger.debug(`getAssessments returned ${response.length} items`)
                return response
            }

            // Handle nested structure: { assessments: [...] }
            if (response?.assessments && Array.isArray(response.assessments)) {
                apiLogger.debug(`getAssessments extracted ${response.assessments.length} items from nested response`)
                return response.assessments
            }

            // Handle nested structure: { data: [...] }
            if (response?.data && Array.isArray(response.data)) {
                apiLogger.warn('getAssessments: Response was nested in data, extracting array')
                return response.data
            }

            // Fallback: return empty array for unexpected structure
            apiLogger.error('getAssessments: Unexpected response structure', response)
            return []
        } catch (error) {
            apiLogger.error('getAssessments failed', error)
            throw error
        }
    },

    getAssessmentDetail: (id: string) => fetchWithAuth(`/admin/assessments/${id}`),

    getAudioUrl: (assessmentId: string, responseId: string) =>
        fetchWithAuth(`/admin/assessments/${assessmentId}/audio/${responseId}`)
}

// ============================================
// Jobs API
// ============================================

export interface JobRoleInput {
    title: string
    department: string
    description: string
    requirements: string
}

export interface JobRoleUpdate {
    title?: string
    department?: string
    description?: string
    requirements?: string
    current_version?: number  // For optimistic locking
}

export interface JobRole {
    id: string
    title: string
    department: string
    description: string
    requirements: string
    status: 'pending' | 'approved' | 'rejected'
    is_open: boolean
    created_by?: string
    created_at: string
    approved_by?: string
    approved_at?: string
    rejection_reason?: string
    version: number  // For optimistic locking
}

export interface ApplicationInput {
    cover_letter?: string
    resume_url?: string
    phone?: string
    linkedin_url?: string
}

export interface JobApplication {
    id: string
    job_id: string
    applicant_id: string
    status: 'submitted' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'
    cover_letter?: string
    resume_url?: string
    phone?: string
    linkedin_url?: string
    created_at: string
    feedback?: string
    // Enriched fields from backend
    job_title?: string
    candidate_name?: string
    candidate_email?: string
    candidate_avatar?: string
}

export const jobsApi = {
    // Create a new job role (employee/admin)
    create: (data: JobRoleInput): Promise<JobRole> =>
        fetchWithAuth('/api/jobs', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // List job roles (employees see own, admins see all)
    list: (): Promise<JobRole[]> =>
        fetchWithAuth('/api/jobs'),

    // List pending jobs for approval (hr/admin)
    listPending: (): Promise<JobRole[]> =>
        fetchWithAuth('/api/jobs/pending'),

    // List public jobs (no auth required)
    listPublic: (): Promise<JobRole[]> =>
        fetchPublic('/api/jobs/public'),

    // Get job details
    get: (id: string): Promise<JobRole> =>
        fetchWithAuth(`/api/jobs/${id}`),

    // Update job (owner/admin)
    update: (id: string, data: JobRoleUpdate): Promise<JobRole> =>
        fetchWithAuth(`/api/jobs/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    // Delete job (owner/admin)
    delete: (id: string): Promise<void> =>
        fetchWithAuth(`/api/jobs/${id}`, {
            method: 'DELETE'
        }),

    // Approve job (hr/admin)
    approve: (id: string): Promise<JobRole> =>
        fetchWithAuth(`/api/jobs/${id}/approve`, {
            method: 'PATCH'
        }),

    // Reject job with reason (hr/admin)
    reject: (id: string, reason: string): Promise<JobRole> =>
        fetchWithAuth(`/api/jobs/${id}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
        }),

    // Close job (hr/admin)
    close: (id: string): Promise<JobRole> =>
        fetchWithAuth(`/api/jobs/${id}/close`, {
            method: 'PATCH'
        }),

    // Apply for job (any authenticated user)
    apply: (id: string, data: ApplicationInput): Promise<JobApplication> =>
        fetchWithAuth(`/api/jobs/${id}/apply`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // List applications for a job (hr/admin)
    listApplications: (id: string): Promise<JobApplication[]> =>
        fetchWithAuth(`/api/jobs/${id}/applications`),

    // Get approval history (hr/admin)
    getApprovalHistory: (id: string) =>
        fetchWithAuth(`/api/jobs/${id}/approvals`)
}

export const applicationsApi = {
    // List all applications (hr/admin)
    listAll: (): Promise<JobApplication[]> => fetchWithAuth('/api/applications'),

    // Update application status
    updateStatus: (id: string, status: string, feedback?: string) =>
        fetchWithAuth(`/api/applications/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, feedback })
        })
}

export const storageApi = {
    signUrl: async (url: string, download: boolean = false) => {
        const response = await fetchWithAuth('/api/storage/sign', {
            method: 'POST',
            body: JSON.stringify({ url, download })
        });
        return response.url;
    }
}

export default {
    get: (url: string) => fetchWithAuth(url),
    post: (url: string, body: any) => fetchWithAuth(url, { method: 'POST', body: JSON.stringify(body) }),
    put: (url: string, body: any) => fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (url: string, body: any) => fetchWithAuth(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' })
}
