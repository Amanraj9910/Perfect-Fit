import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { JobRole } from '@/lib/api'
import {
    CheckCircle,
    Clock,
    Loader2,
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

// Helper component for expandable text
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

interface PublicJobCardProps {
    job: JobRole
    expanded: boolean
    onToggleExpand: () => void
    onApply: (jobId: string) => void
    isApplying: boolean
    hasApplied: boolean
}

export function PublicJobCard({ job, expanded, onToggleExpand, onApply, isApplying, hasApplied }: PublicJobCardProps) {

    return (
        <div className="border rounded-xl bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Job Header */}
            <div
                className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={onToggleExpand}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="font-bold text-lg text-primary">{job.title}</h3>
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" /> Open
                            </Badge>
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
                        <div className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                            {expanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
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

                    <div className="p-4 bg-muted/30 border-t flex justify-end">
                        {hasApplied ? (
                            <Button disabled variant="secondary" className="gap-2 font-medium bg-green-500/10 text-green-700 hover:bg-green-500/20">
                                <CheckCircle className="h-4 w-4" />
                                Application Submitted
                            </Button>
                        ) : (
                            <Button
                                onClick={() => onApply(job.id)}
                                disabled={isApplying}
                                size="lg"
                                className="shadow-md hover:shadow-lg transition-all min-w-[150px]"
                            >
                                {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Apply Now"}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
