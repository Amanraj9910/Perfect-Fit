'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Briefcase, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import axios, { AxiosError } from 'axios'
import { useAuth } from '@/providers/auth-provider'
import { Alert, AlertDescription, AlertTitle } from '@/app/employee/dashboard/alter'
import { Button } from '@/components/ui/button'

// TypeScript interfaces for type safety
interface EmployeeStats {
    total_jobs: number
    pending_jobs: number
    approved_jobs: number
    rejected_jobs: number
}

interface StatCardProps {
    title: string
    value: number
    description: string
    icon: React.ReactNode
}

// Reusable StatCard component
function StatCard({ title, value, description, icon }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}

export default function EmployeeDashboard() {
    const { session } = useAuth()
    const accessToken = session?.access_token

    const { data: stats, isLoading, error, refetch } = useQuery<EmployeeStats>({
        queryKey: ['employee-stats'],
        queryFn: async () => {
            // Validate access token
            if (!accessToken) {
                throw new Error('Authentication required. Please log in again.')
            }

            // Validate API URL
            const apiUrl = process.env.NEXT_PUBLIC_API_URL
            if (!apiUrl) {
                throw new Error('API configuration missing. Please contact support.')
            }

            try {
                const res = await axios.get<EmployeeStats>(`${apiUrl}/api/employee/stats`, {
                    headers: {
                        'X-Supabase-Auth': accessToken,
                    },
                    timeout: 10000, // 10 second timeout
                })

                // Validate response data
                if (!res.data || typeof res.data !== 'object') {
                    throw new Error('Invalid response from server')
                }

                return res.data
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    const status = err.response?.status;

                    if (status === 401) {
                        throw new Error('Session expired. Please log in again.');
                    }

                    if (status === 403) {
                        throw new Error('Access denied. You do not have permission to view this data.');
                    }

                    if (status && status >= 500) {
                        throw new Error('Server error. Please try again later.');
                    }

                    if (err.code === 'ECONNABORTED') {
                        throw new Error('Request timeout. Please check your connection.');
                    }
                }

                throw err;
            }

        },
        enabled: !!accessToken,
        retry: (failureCount, error) => {
            // Don't retry on auth errors or client errors
            if (error instanceof Error) {
                if (error.message.includes('Session expired') ||
                    error.message.includes('Access denied') ||
                    error.message.includes('Authentication required')) {
                    return false
                }
            }
            // Retry up to 2 times for other errors
            return failureCount < 2
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    })

    // Loading state
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    // Error state with retry option
    if (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'

        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Failed to Load Dashboard</AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                        <p>{errorMessage}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="mt-2"
                        >
                            Try Again
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // No data state (shouldn't happen if query is successful, but good to handle)
    if (!stats) {
        return (
            <div className="container mx-auto p-6">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Data Available</AlertTitle>
                    <AlertDescription>
                        Unable to retrieve dashboard statistics.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Validate stats data with defaults
    const safeStats: EmployeeStats = {
        total_jobs: stats.total_jobs ?? 0,
        pending_jobs: stats.pending_jobs ?? 0,
        approved_jobs: stats.approved_jobs ?? 0,
        rejected_jobs: stats.rejected_jobs ?? 0,
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Jobs"
                    value={safeStats.total_jobs}
                    description="All posted roles"
                    icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard
                    title="Pending Approval"
                    value={safeStats.pending_jobs}
                    description="Awaiting HR review"
                    icon={<Clock className="h-4 w-4 text-yellow-500" />}
                />
                <StatCard
                    title="Active Jobs"
                    value={safeStats.approved_jobs}
                    description="Currently open"
                    icon={<CheckCircle className="h-4 w-4 text-green-500" />}
                />
                <StatCard
                    title="Rejected"
                    value={safeStats.rejected_jobs}
                    description="Needs revision"
                    icon={<XCircle className="h-4 w-4 text-red-500" />}
                />
            </div>

            {/* Future enhancement: Recent Activity Section */}
            {/* <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Coming soon...</p>
                    </CardContent>
                </Card>
            </div> */}
        </div>
    )
}