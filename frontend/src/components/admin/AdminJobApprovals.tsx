'use client'

import { useState } from 'react'
import { useAdminJobs, usePendingJobs, useApproveJob, useRejectJob, useCloseJob } from '@/lib/hooks/use-admin-queries'
import { JobRole } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
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
    Calendar,
    X,
    UserCircle,
    FileText,
    MapPin,
    DollarSign,
    Target
} from 'lucide-react'

// Helper component for expandable text
const ExpandableText = ({ content, maxChars = 300, className }: { content: string, maxChars?: number, className?: string }) => {
    const [expanded, setExpanded] = useState(false)
    const shouldTruncate = content.length > maxChars

    const displayContent = shouldTruncate && !expanded
        ? content.slice(0, maxChars) + '...'
        : content

    return (
        <div className={cn("text-sm text-muted-foreground", className)}>
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 text-muted-foreground">
                <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
            {shouldTruncate && (
                <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1 text-primary font-medium"
                    onClick={(e) => {
                        e.stopPropagation()
                        setExpanded(!expanded)
                    }}
                >
                    {expanded ? 'Show Less' : 'Show More'}
                </Button>
            )}
        </div>
    )
}

export default function AdminJobApprovals() {
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedJob, setExpandedJob] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'pending' | 'all'>('pending')

    // Reject dialog state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    // Use React Query for data fetching and caching
    const { data: allJobs = [], isLoading: allJobsLoading, error: allJobsError } = useAdminJobs()
    const { data: pendingJobs = [], isLoading: pendingLoading } = usePendingJobs()

    // Mutation hooks
    const approveJobMutation = useApproveJob()
    const rejectJobMutation = useRejectJob()
    const closeJobMutation = useCloseJob()

    const isLoading = allJobsLoading || pendingLoading
    const actionLoading = approveJobMutation.isPending || rejectJobMutation.isPending || closeJobMutation.isPending

    const handleApprove = async (jobId: string) => {
        try {
            await approveJobMutation.mutateAsync(jobId)
        } catch (err) {
            console.error('Error approving job:', err)
        }
    }

    const handleRejectClick = (jobId: string) => {
        setSelectedJobId(jobId)
        setRejectReason('')
        setRejectDialogOpen(true)
    }

    const handleRejectConfirm = async () => {
        if (!selectedJobId || !rejectReason.trim()) return

        try {
            await rejectJobMutation.mutateAsync({ jobId: selectedJobId, reason: rejectReason })
            setRejectDialogOpen(false)
            setSelectedJobId(null)
            setRejectReason('')
        } catch (err) {
            console.error('Error rejecting job:', err)
        }
    }

    const handleClose = async (jobId: string) => {
        if (!confirm('Are you sure you want to close this job? It will no longer accept applications.')) return

        try {
            await closeJobMutation.mutateAsync(jobId)
        } catch (err) {
            console.error('Error closing job:', err)
        }
    }

    const getStatusBadge = (job: JobRole) => {
        switch (job.status) {
            case 'approved':
                return (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                    </Badge>
                )
            case 'rejected':
                return (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                    </Badge>
                )
            default:
                return (
                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                )
        }
    }

    const displayJobs = viewMode === 'pending' ? pendingJobs : allJobs
    const filteredJobs = displayJobs.filter((job: JobRole) =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {allJobsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-medium">Error</p>
                            <p className="text-sm">{allJobsError instanceof Error ? allJobsError.message : 'Unknown error'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-700">Pending Approval</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-700">{pendingJobs.length}</div>
                        <p className="text-xs text-yellow-600/80 mt-1">Requiring action</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-white border-green-100/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Approved & Open</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {allJobs.filter((j: JobRole) => j.status === 'approved' && j.is_open).length}
                        </div>
                        <p className="text-xs text-green-600/80 mt-1">Active listings</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Total Jobs</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{allJobs.length}</div>
                        <p className="text-xs text-blue-600/80 mt-1">All time</p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <Card className="border-none shadow-sm bg-transparent">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-1">Job Approvals</h2>
                        <p className="text-muted-foreground">
                            Manage job postings and review approval requests.
                        </p>
                    </div>
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            className={cn(
                                "text-sm font-medium px-4 py-1.5 rounded-md transition-all",
                                viewMode === 'pending'
                                    ? "bg-white text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                            )}
                            onClick={() => setViewMode('pending')}
                        >
                            Pending ({pendingJobs.length})
                        </button>
                        <button
                            className={cn(
                                "text-sm font-medium px-4 py-1.5 rounded-md transition-all",
                                viewMode === 'all'
                                    ? "bg-white text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                            )}
                            onClick={() => setViewMode('all')}
                        >
                            All Jobs
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, department, or location..."
                        className="pl-9 bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Jobs List */}
                {filteredJobs.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-dashed">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">No jobs found</h3>
                        <p className="text-muted-foreground">
                            {viewMode === 'pending'
                                ? 'There are no jobs currently pending approval.'
                                : 'No jobs match your search criteria.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredJobs.map((job: JobRole) => (
                            <div
                                key={job.id}
                                className="border rounded-xl bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
                            >
                                {/* Job Header */}
                                <div
                                    className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center flex-wrap gap-2 mb-2">
                                                <h3 className="font-bold text-lg text-primary">{job.title}</h3>
                                                {getStatusBadge(job)}
                                                {!job.is_open && (
                                                    <Badge variant="outline" className="text-muted-foreground">Closed</Badge>
                                                )}
                                                <Badge variant="secondary" className="font-normal border-transparent bg-slate-100 text-slate-700">
                                                    {job.department}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-3">
                                                <div className="flex items-center gap-1.5 min-w-[140px]">
                                                    <UserCircle className="h-4 w-4 text-slate-400" />
                                                    <span>Posted by <span className="font-medium text-foreground">{job.creator?.full_name || job.profiles?.full_name || 'Unknown'}</span></span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    <span>{new Date(job.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                                </div>
                                                {job.location && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        <span>{job.location}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start pt-1">
                                            {job.status === 'pending' && (
                                                <div className="flex gap-2 mr-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 h-8 font-medium shadow-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleApprove(job.id)
                                                        }}
                                                        disabled={actionLoading}
                                                    >
                                                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleRejectClick(job.id)
                                                        }}
                                                        disabled={actionLoading}
                                                    >
                                                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                            {job.status === 'approved' && job.is_open && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-muted-foreground hover:text-foreground mr-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleClose(job.id)
                                                    }}
                                                    disabled={actionLoading}
                                                >
                                                    Close Job
                                                </Button>
                                            )}
                                            <div className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                                                {expandedJob === job.id ? (
                                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedJob === job.id && (
                                    <div className="border-t bg-slate-50/50 divide-y divide-slate-100">
                                        {/* Quick Info Bar */}
                                        <div className="bg-slate-50 px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                                            <div>
                                                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Employment</span>
                                                <span className="font-medium text-foreground">{job.employment_type || 'Full-time'}</span>
                                                <span className="text-muted-foreground ml-1">({job.work_mode || 'On-site'})</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Compensation</span>
                                                <div className="flex items-center font-medium text-foreground">
                                                    <DollarSign className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                                    {job.salary_min && job.salary_max
                                                        ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                                                        : 'Not specified'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Experience</span>
                                                <span className="font-medium text-foreground">{job.min_experience ? `${job.min_experience}+ Years` : 'Entry Level'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Requirements</span>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {job.is_english_required && <Badge variant="outline" className="bg-white text-[10px] py-0 px-1.5 h-5">English</Badge>}
                                                    {job.is_coding_required && <Badge variant="outline" className="bg-white text-[10px] py-0 px-1.5 h-5">Coding</Badge>}
                                                    {job.is_technical_required && <Badge variant="outline" className="bg-white text-[10px] py-0 px-1.5 h-5">Technical</Badge>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 grid lg:grid-cols-2 gap-8">
                                            {/* Left Column: Description */}
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="flex items-center text-sm font-semibold text-foreground bg-white border w-fit px-3 py-1 rounded-full mb-3 shadow-sm">
                                                        <FileText className="h-3.5 w-3.5 mr-2 text-primary" />
                                                        Job Description
                                                    </h4>
                                                    <Card className="shadow-none border-dashed bg-white/50">
                                                        <CardContent className="p-4">
                                                            <ExpandableText content={job.description} />
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                {(job.job_responsibilities?.length ?? 0) > 0 && (
                                                    <div>
                                                        <h4 className="flex items-center text-sm font-semibold text-foreground bg-white border w-fit px-3 py-1 rounded-full mb-3 shadow-sm">
                                                            <Target className="h-3.5 w-3.5 mr-2 text-primary" />
                                                            Key Responsibilities
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {job.job_responsibilities?.map((resp) => (
                                                                <li key={resp.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-100 text-sm text-slate-600">
                                                                    <div className="min-w-[4px] h-[4px] rounded-full bg-primary mt-2" />
                                                                    <span>{resp.content}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Column: Requirements & Skills */}
                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="flex items-center text-sm font-semibold text-foreground bg-white border w-fit px-3 py-1 rounded-full mb-3 shadow-sm">
                                                        <CheckCircle className="h-3.5 w-3.5 mr-2 text-primary" />
                                                        Requirements
                                                    </h4>
                                                    <Card className="shadow-none border-dashed bg-white/50">
                                                        <CardContent className="p-4">
                                                            <ExpandableText content={job.requirements} />
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                {(job.job_skills?.length ?? 0) > 0 && (
                                                    <div>
                                                        <h4 className="flex items-center text-sm font-semibold text-foreground bg-white border w-fit px-3 py-1 rounded-full mb-3 shadow-sm">
                                                            <Briefcase className="h-3.5 w-3.5 mr-2 text-primary" />
                                                            Required Skills
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {job.job_skills?.map((skill) => (
                                                                <span key={skill.id} className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-white border text-slate-700 shadow-sm">
                                                                    {skill.skill_name}
                                                                    <span className="ml-1.5 text-xs text-slate-400 border-l pl-1.5 font-normal">
                                                                        {skill.min_years}y
                                                                    </span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Meta Info */}
                                                {(job.status === 'approved' || job.status === 'rejected') && (
                                                    <div className={cn(
                                                        "mt-6 p-4 rounded-lg border",
                                                        job.status === 'approved' ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                                                    )}>
                                                        <div className="flex items-start gap-3">
                                                            {job.status === 'approved' ? (
                                                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                                            ) : (
                                                                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                                            )}
                                                            <div>
                                                                <h4 className={cn("font-medium text-sm mb-1",
                                                                    job.status === 'approved' ? "text-green-800" : "text-red-800"
                                                                )}>
                                                                    {job.status === 'approved' ? 'Approval Details' : 'Rejection Details'}
                                                                </h4>
                                                                {job.status === 'rejected' && (
                                                                    <p className="text-sm text-red-700 mb-2">{job.rejection_reason}</p>
                                                                )}
                                                                <div className={cn("text-xs",
                                                                    job.status === 'approved' ? "text-green-600" : "text-red-600"
                                                                )}>
                                                                    Process completed by <span className="font-medium">
                                                                        {job.approver?.full_name || job.approved_by || 'Admin'}
                                                                    </span> on {job.approved_at ? new Date(job.approved_at).toLocaleString() : 'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
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
