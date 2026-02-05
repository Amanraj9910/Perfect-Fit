
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../supabase';

const API_BASE_URL = 'http://localhost:8000';

async function fetchWithAuth(endpoint: string) {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) throw new Error("No session");

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "X-Supabase-Auth": token
        }
    });

    if (!response.ok) {
        throw new Error("Failed to fetch");
    }

    return response.json();
}

export function useCandidateProfile() {
    return useQuery({
        queryKey: ['candidate', 'me'],
        queryFn: () => fetchWithAuth('/api/candidates/me'),
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
