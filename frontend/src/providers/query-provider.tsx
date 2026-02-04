'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, ReactNode } from 'react'

// Default options for all queries
const defaultQueryOptions = {
    queries: {
        // Data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Cache is kept for 30 minutes after last access
        gcTime: 30 * 60 * 1000,
        // Refetch on window focus (when user returns to tab)
        refetchOnWindowFocus: true,
        // Don't refetch on mount if data is fresh
        refetchOnMount: false,
        // Retry failed requests up to 2 times
        retry: 2,
        // Exponential backoff for retries
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
}

interface QueryProviderProps {
    children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
    // Create QueryClient inside component to ensure it's created once per client
    const [queryClient] = useState(
        () => new QueryClient({ defaultOptions: defaultQueryOptions })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* DevTools only in development */}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
            )}
        </QueryClientProvider>
    )
}
