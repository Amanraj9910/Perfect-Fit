import { getSupabaseClient } from './supabase'

const API_BASE_URL = 'http://localhost:8000'

// Generic fetch wrapper with Auth
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    const token = session?.access_token

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-supabase-auth': token } : {}), // Pass Supabase Token
        ...options.headers,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || `API Error: ${response.statusText}`)
    }

    return response.json()
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

    getAssessments: (limit = 20) => fetchWithAuth(`/admin/assessments?limit=${limit}`),

    getAssessmentDetail: (id: string) => fetchWithAuth(`/admin/assessments/${id}`),

    getAudioUrl: (assessmentId: string, responseId: string) =>
        fetchWithAuth(`/admin/assessments/${assessmentId}/audio/${responseId}`)
}
