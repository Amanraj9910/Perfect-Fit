
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api' // Ensure this exists or use axios directly
import { Loader2, Briefcase, Clock, CheckCircle, XCircle } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/providers/auth-provider'

export default function EmployeeDashboard() {
    const { accessToken } = useAuth()

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['employee-stats'],
        queryFn: async () => {
            // Assuming axios instance or custom fetcher that attaches token
            // If api.get doesn't exist, use axios
            if (!accessToken) return null;
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/employee/stats`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            return res.data
        },
        enabled: !!accessToken
    })

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    if (error) {
        return <div className="p-8 text-red-500">Failed to load dashboard statistics.</div>
    }

    if (!stats) return null

    return (
        <div className="container mx-auto p-6 space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_jobs}</div>
                        <p className="text-xs text-muted-foreground">All posted roles</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending_jobs}</div>
                        <p className="text-xs text-muted-foreground">Awaiting HR review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approved_jobs}</div>
                        <p className="text-xs text-muted-foreground">Currently open</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.rejected_jobs}</div>
                        <p className="text-xs text-muted-foreground">Needs revision</p>
                    </CardContent>
                </Card>
            </div>

            {/* Can add Recent Activity Section Here */}
        </div>
    )
}
