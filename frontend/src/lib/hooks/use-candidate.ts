
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../api';

export function useCandidateProfile() {
    return useQuery({
        queryKey: ['candidate', 'me'],
        queryFn: () => candidateApi.getProfile(),
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useMyApplications() {
    return useQuery({
        queryKey: ['applications', 'me'],
        queryFn: () => import('../api').then(({ applicationsApi }) => applicationsApi.listMine()),
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
