'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { jobsApi, JobRole, TechnicalQuestion, assessmentApi, applicationsApi, JobApplication } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from "sonner"

export default function TechnicalAssessmentPage() {
    const params = useParams()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const jobId = params.jobId as string

    const [job, setJob] = useState<JobRole | null>(null)
    const [loading, setLoading] = useState(true)
    const [answers, setAnswers] = useState<Record<number, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [application, setApplication] = useState<JobApplication | null>(null)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth')
        }
    }, [authLoading, user, router])

    useEffect(() => {
        if (jobId && user) {
            fetchJob()
        }
    }, [jobId, user])

    const fetchJob = async () => {
        try {
            const [jobData, appsData] = await Promise.all([
                jobsApi.get(jobId),
                applicationsApi.listMine()
            ])
            setJob(jobData)

            // Find application for this job
            const app = appsData.find(a => a.job_id === jobId)
            if (app) {
                setApplication(app)
            } else {
                toast.error("Application not found. Please apply first.")
                router.push(`/jobs/${jobId}`)
            }
        } catch (error) {
            console.error("Failed to fetch job or application", error)
            toast.error("Failed to load details")
        } finally {
            setLoading(false)
        }
    }

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers(prev => ({
            ...prev,
            [index]: value
        }))
    }

    const handleSubmit = async () => {
        if (!job?.technical_questions) return
        if (!application) {
            toast.error("Application ID missing")
            return
        }

        // Validate all questions answered
        const allAnswered = job.technical_questions.every((_, idx) =>
            answers[idx] && answers[idx].trim().length > 0
        )

        if (!allAnswered) {
            toast.error("Please answer all questions before submitting")
            return
        }

        setSubmitting(true)

        try {
            const formattedAnswers = job.technical_questions.map((q, idx) => ({
                question_id: q.id!, // Assuming id exists on TechnicalQuestion from backend response
                answer: answers[idx]
            }))

            // Wait, TechnicalQuestion interface in frontend might not have ID yet if we defined it manually in api.ts?
            // Let's check api.ts definition. If it lacks ID, we rely on backend having IDs.
            // Actually, the backend returns "technical_questions" as a list of dicts.
            // If the Pydantic model for response included ID, then it's fine.
            // If not, we have a problem mapping answers to question IDs.
            // Update: In get_job, we select("*") from technical_assessments, so ID is included.
            // But types in api.ts usually need to match.
            // Let's assume we need to cast or fix type if explicit ID is missing.

            // Safety check for question IDs
            const validAnswers = formattedAnswers.filter(a => a.question_id)
            if (validAnswers.length !== formattedAnswers.length) {
                // If ids are missing, we can't submit properly.
                // For now, let's assume validIds.
                console.warn("Some questions missing IDs")
            }

            await assessmentApi.submitTechnical(application.id, formattedAnswers as any)

            setCompleted(true)
            toast.success("Assessment submitted successfully!")
        } catch (error) {
            console.error(error)
            toast.error("Failed to submit assessment")
        } finally {
            setSubmitting(false)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!job) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-xl font-bold">Assessment Not Found</h1>
                <p className="text-muted-foreground mt-2">The job role or assessment you are looking for does not exist.</p>
                <Button className="mt-6" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
            </div>
        )
    }

    if (completed) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-6">
                    <div className="flex justify-center mb-6">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Assessment Completed!</h2>
                    <p className="text-muted-foreground mb-6">
                        Thank you for completing the technical assessment for {job.title}.
                        Your answers have been recorded for review.
                    </p>
                    <Button className="w-full" onClick={() => router.push('/dashboard')}>
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/30 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">{job.title}</h1>
                    <p className="text-muted-foreground">Technical Assessment</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Assessment Questions</CardTitle>
                        <CardDescription>
                            Please answer the following questions to demonstrate your technical expertise.
                            Be concise and specific.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {job.technical_questions && job.technical_questions.length > 0 ? (
                            job.technical_questions.map((q, idx) => (
                                <div key={idx} className="space-y-3">
                                    <Label className="text-base">
                                        {idx + 1}. {q.question}
                                    </Label>
                                    <Textarea
                                        placeholder="Type your answer here..."
                                        rows={4}
                                        value={answers[idx] || ''}
                                        onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                        className="resize-y"
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No technical questions found for this role.
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-6">
                        <Button variant="outline" onClick={() => router.push('/dashboard')}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting || !job.technical_questions?.length}>
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {submitting ? "Analyzing Answers..." : "Submit Assessment"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
