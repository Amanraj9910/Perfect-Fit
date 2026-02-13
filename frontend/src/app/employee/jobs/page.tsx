'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import api from '@/lib/api'
import { JobRole } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import {
    CheckCircle,
    Clock,
    Edit2,
    Loader2,
    PlusCircle,
    Trash2,
    XCircle,
    FileText,
    Target,
    Briefcase,
    MapPin,
    Calendar,
    ChevronDown,
    ChevronUp,
    DollarSign,
    UserCircle
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

// Helper component for expandable text (Shared with AdminJobApprovals)
const ExpandableText = ({ content, maxChars = 300, className }: { content: string, maxChars?: number, className?: string }) => {
    const [expanded, setExpanded] = useState(false)
    const shouldTruncate = content && content.length > maxChars

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

export default function EmployeeJobsPage() {
    const [expandedJob, setExpandedJob] = useState<string | null>(null)

    const { data: jobs, isLoading, error } = useQuery<JobRole[]>({
        queryKey: ['employee-jobs'],
        queryFn: async () => {
            return await api.get('/api/employee/jobs')
        }
    })

    const getStatusBadge = (job: JobRole) => {
        switch (job.status) {
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
                <div className="space-y-4">
                    {jobs?.map((job) => (
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
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span>Posted on {new Date(job.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
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
                                        <Link href={`/employee/jobs/create?id=${job.id}`} onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" className="h-8">
                                                <Edit2 className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                        </Link>
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
                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Assessments</span>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {job.is_english_required && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] py-0 px-1.5 h-5">English</Badge>}
                                                {job.is_coding_required && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 px-1.5 h-5">Coding</Badge>}
                                                {job.is_technical_required && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] py-0 px-1.5 h-5">Technical</Badge>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 grid md:grid-cols-3 gap-6">
                                        {/* Left Column (2/3) - Description */}
                                        <div className="md:col-span-2 space-y-6">
                                            <section>
                                                <h4 className="flex items-center text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                                                    <FileText className="w-4 h-4 mr-2 text-primary" />
                                                    Job Description
                                                </h4>
                                                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-colors">
                                                    <ExpandableText content={job.description} />
                                                </div>
                                            </section>

                                            <section>
                                                <h4 className="flex items-center text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                                                    <Briefcase className="w-4 h-4 mr-2 text-primary" />
                                                    Required Skills
                                                </h4>
                                                <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100/50 hover:border-blue-200/50 transition-colors">
                                                    {job.job_skills && job.job_skills.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {job.job_skills.map((skill, idx) => (
                                                                <Badge key={idx} variant="outline" className="bg-white text-blue-700 border-blue-200 hover:bg-blue-50 py-1 px-3">
                                                                    {skill.skill_name} <span className="ml-1 text-blue-400 text-xs">| {skill.min_years}y</span>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">No specific skills listed.</p>
                                                    )}
                                                </div>
                                            </section>
                                        </div>

                                        {/* Right Column (1/3) - Responsibilities & Requirements */}
                                        <div className="space-y-6">
                                            <section>
                                                <h4 className="flex items-center text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                                                    <Target className="w-4 h-4 mr-2 text-primary" />
                                                    Key Responsibilities
                                                </h4>
                                                <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-colors">
                                                    {job.job_responsibilities && job.job_responsibilities.length > 0 ? (
                                                        <ul className="space-y-3">
                                                            {job.job_responsibilities.map((resp, idx) => (
                                                                <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                                                    <span className="leading-relaxed">{resp.content}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">No specific responsibilities listed.</p>
                                                    )}
                                                </div>
                                            </section>

                                            <section>
                                                <h4 className="flex items-center text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                                                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                                                    Requirements
                                                </h4>
                                                <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100/50 hover:border-orange-200/50 transition-colors">
                                                    <ExpandableText content={job.requirements} maxChars={150} />
                                                </div>
                                            </section>
                                        </div>
                                    </div>

                                    {(job.status === 'approved' || job.status === 'rejected') && (
                                        <div className={cn(
                                            "border-t p-4 flex items-start gap-3",
                                            job.status === 'approved' ? "bg-green-50/50" : "bg-red-50/50"
                                        )}>
                                            {job.status === 'approved' ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                            )}
                                            <div className="flex-1">
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
                                                    Processed by <span className="font-medium">
                                                        {job.approver?.full_name || job.approved_by || 'Admin'}
                                                    </span> on {job.approved_at ? new Date(job.approved_at).toLocaleString() : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
