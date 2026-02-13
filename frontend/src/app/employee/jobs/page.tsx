
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'
import { JobRole } from '@/lib/api' // Shared type
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock, Edit2, Loader2, PlusCircle, Trash2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function EmployeeJobsPage() {
    const { data: jobs, isLoading, error } = useQuery<JobRole[]>({
        queryKey: ['employee-jobs'],
        queryFn: async () => {
            return await api.get('/api/employee/jobs')
        }
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
            case 'rejected':
                return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
            default:
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
        }
    }

    if (isLoading) {
        return <div className="flex bg-muted/10 h-full items-center justify-center min-h-[500px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    if (error) {
        return <div className="p-8 text-red-500">Failed to load jobs.</div>
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
                    <p className="text-muted-foreground">Manage your job postings and track their status.</p>
                </div>
                <Link href="/employee/jobs/create">
                    <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create New Job
                    </Button>
                </Link>
            </div>

            {jobs?.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <div className="bg-muted p-4 rounded-full mb-4">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No jobs created yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">Get started by creating your first job posting. It will be sent to HR for approval.</p>
                    <Link href="/employee/jobs/create">
                        <Button variant="outline">Create Job</Button>
                    </Link>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {jobs?.map((job) => (
                        <Card key={job.id} className="overflow-hidden">
                            <CardHeader className="pb-3 bg-muted/5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <CardTitle className="text-lg">{job.title}</CardTitle>
                                            {getStatusBadge(job.status)}
                                            {!job.is_open && <Badge variant="outline">Closed</Badge>}
                                        </div>
                                        <CardDescription>{job.department} • Posted on {new Date(job.created_at).toLocaleDateString()}</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/employee/jobs/create?id=${job.id}`}>
                                            <Button variant="ghost" size="icon" title="Edit">
                                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="font-medium text-muted-foreground mb-1">Role Description</p>
                                        <p className="line-clamp-2">{job.description}</p>
                                    </div>
                                    {job.rejection_reason && (
                                        <div className="bg-red-50 p-3 rounded-md border border-red-100">
                                            <p className="font-medium text-red-800 mb-1">Feedback</p>
                                            <p className="text-red-700">{job.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
