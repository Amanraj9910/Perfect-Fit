'use client'

import { useEffect, useState } from 'react'
import { jobsApi, JobRole } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    Briefcase,
    Search,
    ChevronDown,
    ChevronUp,
    User,
    Calendar,
    FileText,
    X
} from 'lucide-react'

export default function AdminJobApprovals() {
    const [pendingJobs, setPendingJobs] = useState<JobRole[]>([])
    const [allJobs, setAllJobs] = useState<JobRole[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedJob, setExpandedJob] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'pending' | 'all'>('pending')

    // Reject dialog state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    const fetchJobs = async () => {
        setLoading(true)
        setError(null)
        try {
            const [pending, all] = await Promise.all([
                jobsApi.listPending(),
                jobsApi.list()
            ])
            setPendingJobs(pending || [])
            setAllJobs(all || [])
        } catch (err) {
            console.error('Error fetching jobs:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchJobs()
    }, [])

    const handleApprove = async (jobId: string) => {
        setActionLoading(true)
        try {
            await jobsApi.approve(jobId)
            fetchJobs()
        } catch (err) {
            console.error('Error approving job:', err)
            setError(err instanceof Error ? err.message : 'Failed to approve job')
        } finally {
            setActionLoading(false)
        }
    }

    const handleRejectClick = (jobId: string) => {
        setSelectedJobId(jobId)
        setRejectReason('')
        setRejectDialogOpen(true)
    }

    const handleRejectConfirm = async () => {
        if (!selectedJobId || !rejectReason.trim()) return

        setActionLoading(true)
        try {
            await jobsApi.reject(selectedJobId, rejectReason)
            setRejectDialogOpen(false)
            setSelectedJobId(null)
            setRejectReason('')
            fetchJobs()
        } catch (err) {
            console.error('Error rejecting job:', err)
            setError(err instanceof Error ? err.message : 'Failed to reject job')
        } finally {
            setActionLoading(false)
        }
    }

    const handleClose = async (jobId: string) => {
        if (!confirm('Are you sure you want to close this job? It will no longer accept applications.')) return

        setActionLoading(true)
        try {
            await jobsApi.close(jobId)
            fetchJobs()
        } catch (err) {
            console.error('Error closing job:', err)
            setError(err instanceof Error ? err.message : 'Failed to close job')
        } finally {
            setActionLoading(false)
        }
    }

    const getStatusBadge = (job: JobRole) => {
        switch (job.status) {
            case 'approved':
                return (
                    <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                    </Badge>
                )
            case 'rejected':
                return (
                    <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                    </Badge>
                )
            default:
                return (
                    <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                )
        }
    }

    const displayJobs = viewMode === 'pending' ? pendingJobs : allJobs
    const filteredJobs = displayJobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-medium">Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setError(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingJobs.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Approved & Open</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {allJobs.filter(j => j.status === 'approved' && j.is_open).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allJobs.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5" />
                                Job Role Approvals
                            </CardTitle>
                            <CardDescription>
                                Review and approve job roles submitted by employees
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'pending' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('pending')}
                            >
                                Pending ({pendingJobs.length})
                            </Button>
                            <Button
                                variant={viewMode === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('all')}
                            >
                                All Jobs
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search */}
                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by title or department..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Jobs List */}
                    {filteredJobs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>
                                {viewMode === 'pending'
                                    ? 'No jobs pending approval'
                                    : 'No jobs found'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredJobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="border rounded-lg overflow-hidden"
                                >
                                    {/* Job Header */}
                                    <div
                                        className="p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-lg">{job.title}</h3>
                                                    {getStatusBadge(job)}
                                                    {!job.is_open && (
                                                        <Badge variant="outline">Closed</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="h-3 w-3" />
                                                        {job.department}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(job.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {job.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleApprove(job.id)
                                                            }}
                                                            disabled={actionLoading}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleRejectClick(job.id)
                                                            }}
                                                            disabled={actionLoading}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {job.status === 'approved' && job.is_open && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleClose(job.id)
                                                        }}
                                                        disabled={actionLoading}
                                                    >
                                                        Close Job
                                                    </Button>
                                                )}
                                                {expandedJob === job.id ? (
                                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedJob === job.id && (
                                        <div className="p-4 border-t bg-white">
                                            <div className="grid gap-4">
                                                <div>
                                                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                        Description
                                                    </h4>
                                                    <p className="text-sm whitespace-pre-wrap">{job.description}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                                                        Requirements
                                                    </h4>
                                                    <p className="text-sm whitespace-pre-wrap">{job.requirements}</p>
                                                </div>
                                                {job.rejection_reason && (
                                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                        <h4 className="font-medium text-sm text-red-800 mb-1">
                                                            Rejection Reason
                                                        </h4>
                                                        <p className="text-sm text-red-700">{job.rejection_reason}</p>
                                                    </div>
                                                )}
                                                {job.approved_at && (
                                                    <div className="text-sm text-muted-foreground">
                                                        Approved on: {new Date(job.approved_at).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Job Role</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this job role. This will be visible to the employee who created it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Enter rejection reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={!rejectReason.trim() || actionLoading}
                        >
                            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
