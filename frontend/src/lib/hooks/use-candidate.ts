
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../api';
import { useAuth } from '@/providers/auth-provider';

export function useCandidateProfile() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['candidate', 'me'],
        queryFn: () => candidateApi.getProfile(),
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Only fetch when user is authenticated
        enabled: !!user,
    });
}

export function useMyApplications() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['applications', 'me'],
        queryFn: () => import('../api').then(({ applicationsApi }) => applicationsApi.listMine()),
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Only fetch when user is authenticated
        enabled: !!user,
    });
}
