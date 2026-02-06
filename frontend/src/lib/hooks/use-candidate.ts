
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
