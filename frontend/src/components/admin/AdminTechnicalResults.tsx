'use client'

import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Loader2, ChevronDown, ChevronUp, AlertCircle, FileCode, CheckCircle } from "lucide-react"
import { getSupabaseClient } from '../../lib/supabase'

interface TechnicalResult {
    id: string
    application_id: string
    question_id: string
    answer: string
    ai_score: number | null
    ai_reasoning: string
    question_text?: string
    candidate_name?: string
    job_title?: string
    created_at?: string
}

interface GroupedAssessment {
    application_id: string
    candidate_name: string
    job_title: string
    created_at: string
    results: TechnicalResult[]
    average_score: number | null
    status: 'completed' | 'pending'
}

interface AdminTechnicalResultsProps {
    applicationId?: string
}

export default function AdminTechnicalResults({ applicationId }: AdminTechnicalResultsProps) {
    const supabase = getSupabaseClient()
    const [grouped, setGrouped] = useState<GroupedAssessment[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedAppId, setExpandedAppId] = useState<string | null>(null)

    useEffect(() => {
        fetchResults()
    }, [applicationId])

    const fetchResults = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('technical_assessment_responses')
                .select(`
                    *,
                    technical_assessments (question),
                    job_applications (
                        applicant_id,
                        created_at,
                        job_roles (title)
                    )
                `)
                .order('created_at', { ascending: false })

            if (applicationId) {
                query = query.eq('application_id', applicationId)
            } else {
                query = query.limit(200) // Increase limit to get enough groups
            }

            const { data, error } = await query

            if (error) throw error

            if (data) {
                // Enrich and Group
                const enriched: TechnicalResult[] = await Promise.all(data.map(async (item: any) => {
                    let candidateName = "Unknown"
                    if (item.job_applications?.applicant_id) {
                        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', item.job_applications.applicant_id).single()
                        if (p) candidateName = p.full_name
                    }

                    return {
                        id: item.id,
                        application_id: item.application_id,
                        question_id: item.question_id,
                        answer: item.answer,
                        ai_score: item.ai_score,
                        ai_reasoning: item.ai_reasoning,
                        question_text: item.technical_assessments?.question,
                        candidate_name: candidateName,
                        job_title: item.job_applications?.job_roles?.title,
                        created_at: item.created_at
                    }
                }))

                // Group by application_id
                const groups: Record<string, GroupedAssessment> = {}

                enriched.forEach(item => {
                    if (!groups[item.application_id]) {
                        groups[item.application_id] = {
                            application_id: item.application_id,
                            candidate_name: item.candidate_name || "Unknown",
                            job_title: item.job_title || "Unknown Job",
                            created_at: item.created_at || "",
                            results: [],
                            average_score: 0,
                            status: 'completed'
                        }
                    }
                    groups[item.application_id].results.push(item)
                })

                // Calculate stats
                const processed = Object.values(groups).map(g => {
                    const totalScore = g.results.reduce((acc, curr) => acc + (curr.ai_score || 0), 0)
                    const count = g.results.length
                    const hasPending = g.results.some(r => r.ai_score === null || r.ai_score === undefined)

                    return {
                        ...g,
                        average_score: count > 0 ? (totalScore / count) : 0,
                        status: hasPending ? 'pending' as const : 'completed' as const
                    }
                })

                setGrouped(processed)
            }
        } catch (error) {
            console.error("Error fetching technical results:", error)
        } finally {
            setLoading(false)
        }
    }

    const toggleExpand = (appId: string) => {
        setExpandedAppId(expandedAppId === appId ? null : appId)
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (grouped.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-md bg-muted/5">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No technical assessments found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* List View matching AdminAssessmentList style */}
            <div className="rounded-md border bg-white divide-y">
                {grouped.map((group) => (
                    <div key={group.application_id} className="flex flex-col">
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleExpand(group.application_id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <FileCode className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium">{group.candidate_name}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>{group.job_title}</span>
                                        <span>•</span>
                                        <span>{new Date(group.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right min-w-[60px]">
                                    <div className="text-sm font-medium">
                                        {group.status === 'pending' ? '-' : `${group.average_score?.toFixed(1)}/10`}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Avg Score</div>
                                </div>

                                <div className="min-w-[100px] flex justify-end">
                                    {group.status === 'completed' ? (
                                        <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                            <CheckCircle className="h-3 w-3 mr-1" /> Completed
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analyzing
                                        </span>
                                    )}
                                </div>

                                <Button variant="ghost" size="sm">
                                    {expandedAppId === group.application_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedAppId === group.application_id && (
                            <div className="p-4 bg-muted/20 border-t">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-base">Detailed Results</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40%]">Question</TableHead>
                                                    <TableHead className="w-[10%]">Score</TableHead>
                                                    <TableHead>Reasoning</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {group.results.map((result) => (
                                                    <TableRow key={result.id}>
                                                        <TableCell className="align-top">
                                                            <div className="font-medium text-sm mb-1">{result.question_text}</div>
                                                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                                                <span className="font-semibold">Answer: </span>
                                                                {result.answer}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            {result.ai_score === null ? (
                                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 aspect-square h-8 w-8 flex items-center justify-center p-0">
                                                                    -
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant={result.ai_score >= 7 ? "default" : result.ai_score >= 4 ? "secondary" : "destructive"}
                                                                    className="aspect-square h-8 w-8 flex items-center justify-center p-0"
                                                                >
                                                                    {result.ai_score}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="align-top text-sm text-muted-foreground whitespace-pre-wrap">
                                                            {result.ai_reasoning || "Pending analysis..."}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
