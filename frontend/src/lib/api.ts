import { getSupabaseClient } from './supabase'
import { apiLogger, logApiRequest, logApiResponse, logApiError } from './logger'

const API_BASE_URL = 'http://localhost:8000'

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

