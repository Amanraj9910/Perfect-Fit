import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react" // Expecting lucide-react to be available
import { getSupabaseClient } from '@/lib/supabase'

// ...

interface TechnicalResult {
    id: string
    application_id: string
    question_id: string
    answer: string
    ai_score: number
    ai_reasoning: string
    question_text?: string // Joined from technical_assessments
    candidate_name?: string // Joined from profiles
    job_title?: string // Joined from job_roles
}

interface AdminTechnicalResultsProps {
    applicationId?: string
}

export function AdminTechnicalResults({ applicationId }: AdminTechnicalResultsProps) {
    const supabase = getSupabaseClient()
    const [results, setResults] = useState<TechnicalResult[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedRow, setExpandedRow] = useState<string | null>(null)

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
                        job_roles (title)
                    )
                `)

            if (applicationId) {
                query = query.eq('application_id', applicationId)
            } else {
                // If no specific app ID, maybe fetch recent ones? Or just limit?
                query = query.limit(50).order('created_at', { ascending: false })
            }

            const { data, error } = await query

            if (error) throw error

            if (data) {
                // Transform data to flat structure
                const formatted: TechnicalResult[] = await Promise.all(data.map(async (item: any) => {
                    // Fetch candidate name separately if needed, or if we can join profiles through job_applications
                    // optimizing: let's fetch profile name if we have applicant_id
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
                        job_title: item.job_applications?.job_roles?.title
                    }
                }))
                setResults(formatted)
            }
        } catch (error) {
            console.error("Error fetching technical results:", error)
        } finally {
            setLoading(false)
        }
    }

    const toggleRow = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id)
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (results.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>No technical assessment results found.</p>
                </CardContent>
            </Card>
        )
    }

    // Group by Application/Candidate if showing all
    // For now, simple list

    return (
        <Card>
            <CardHeader>
                <CardTitle>Technical Assessment Analysis</CardTitle>
                <CardDescription>AI-generated scores and reasoning for candidate responses.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Candidate</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.map((result) => (
                            <>
                                <TableRow key={result.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(result.id)}>
                                    <TableCell className="font-medium">
                                        <div>{result.candidate_name}</div>
                                        <div className="text-xs text-muted-foreground">{result.job_title}</div>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate">
                                        {result.question_text || "Question deleted"}
                                    </TableCell>
                                    <TableCell>
                                        {result.ai_score === null || result.ai_score === undefined ? (
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                Pending
                                            </Badge>
                                        ) : (
                                            <Badge variant={result.ai_score >= 7 ? "default" : result.ai_score >= 4 ? "secondary" : "destructive"}>
                                                {result.ai_score}/10
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" disabled={result.ai_score === null}>
                                            {expandedRow === result.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                {expandedRow === result.id && (
                                    <TableRow className="bg-muted/30">
                                        <TableCell colSpan={4} className="p-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-1">Full Question</h4>
                                                    <p className="text-sm text-muted-foreground">{result.question_text}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-1">Candidate Answer</h4>
                                                    <div className="bg-background p-3 rounded-md border text-sm whitespace-pre-wrap">
                                                        {result.answer}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-1">AI Reasoning</h4>
                                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-100 dark:border-blue-900 text-sm text-blue-900 dark:text-blue-100">
                                                        {result.ai_reasoning}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
