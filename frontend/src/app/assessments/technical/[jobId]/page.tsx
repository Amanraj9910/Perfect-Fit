'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { jobsApi, JobRole, TechnicalQuestion, assessmentApi, applicationsApi, JobApplication } from '@/lib/api'
import { useAuthenticatedJob } from '@/lib/hooks/use-jobs'
import { useMyApplications } from '@/lib/hooks/use-candidate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, AlertCircle, Clock, ChevronRight, ChevronLeft, Flag } from 'lucide-react'
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

export default function TechnicalAssessmentPage() {
    const params = useParams()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const jobId = params.jobId as string

    // State
    const [started, setStarted] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<number, string>>({})
    const [submitting, setSubmitting] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [tabSwitches, setTabSwitches] = useState(0)
    const [isDisqualified, setIsDisqualified] = useState(false)
    const [timeLeft, setTimeLeft] = useState<number | null>(null) // in seconds

    // React Query Hooks
    const { data: job, isLoading: jobLoading, error: jobError } = useAuthenticatedJob(jobId)
    const { data: applications = [], isLoading: appsLoading } = useMyApplications()

    // Derived state
    const application = applications.find(a => a.job_id === jobId)
    const loading = jobLoading || appsLoading

    // Auth Check
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth')
        }
    }, [authLoading, user, router])

    // Application Check
    useEffect(() => {
        if (!loading && !application && job) {
            toast.error("Application not found. Please apply first.")
            router.push(`/jobs`)
        }
    }, [loading, application, job, router])

    // Initialize Timer on Start
    useEffect(() => {
        if (started && job?.assessment_duration && timeLeft === null) {
            setTimeLeft(job.assessment_duration * 60)
        }
    }, [started, job, timeLeft])

    // Timer Countdown
    useEffect(() => {
        if (!started || completed || isDisqualified || timeLeft === null) return

        if (timeLeft <= 0) {
            handleSubmit()
            return
        }

        const timerId = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null))
        }, 1000)

        return () => clearInterval(timerId)
    }, [started, completed, isDisqualified, timeLeft])

    // Format Time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Tab Switch Detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && started && !completed && !isDisqualified) {
                const newCount = tabSwitches + 1
                setTabSwitches(newCount)

                if (newCount === 1) {
                    toast.warning("Warning: Switching tabs is not allowed!", {
                        description: "If you switch tabs again, you will be disqualified.",
                        duration: 8000,
                        className: "bg-amber-50 border-amber-200",
                        action: {
                            label: "I Understand",
                            onClick: () => console.log("User warned"),
                        },
                    })
                } else if (newCount >= 2) {
                    setIsDisqualified(true)
                    toast.error("You have been disqualified for multiple tab switches.")
                }
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [tabSwitches, completed, isDisqualified, started])

    const handleCopy = (e: React.ClipboardEvent) => {
        e.preventDefault()
        toast.error("Copying question text is disabled.")
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        toast.error("Pasting answer text is disabled.")
    }

    const handleAnswerChange = (value: string) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: value
        }))
    }

    const handleSubmit = async () => {
        if (!job?.technical_questions) return
        if (!application) {
            toast.error("Application ID missing")
            return
        }

        setSubmitting(true)

        try {
            const formattedAnswers = job.technical_questions.map((q: TechnicalQuestion, idx: number) => ({
                question_id: q.id!,
                answer: answers[idx] || "No Answer Provided"
            }))

            // Check if any answer is empty (optional based on timer expiry)
            // If timer expired, we submit whatever we have.

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
                <Button className="mt-6" onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
            </div>
        )
    }

    // Disqualified State
    if (isDisqualified) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-red-50/30">
                <Card className="max-w-md w-full text-center p-8 border-destructive/20 shadow-lg">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                            <AlertCircle className="h-10 w-10 text-red-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-destructive">Disqualified</h2>
                    <p className="text-muted-foreground mb-6">
                        You have been disqualified from this assessment due to multiple tab switches, which violates our anti-cheating integrity policy.
                    </p>
                    <Button variant="destructive" className="w-full" onClick={() => router.push('/dashboard')}>
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        )
    }

    // Completed State
    if (completed) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-green-50/30">
                <Card className="max-w-md w-full text-center p-8 shadow-lg border-green-200">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-green-800">Assessment Completed!</h2>
                    <p className="text-muted-foreground mb-6">
                        Thank you for completing the technical assessment for <span className="font-semibold">{job.title}</span>.
                        Your answers have been securely recorded.
                    </p>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => router.push('/dashboard')}>
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        )
    }

    // Start Screen
    if (!started) {
        const questionCount = job.technical_questions?.length || 0;
        const duration = job.assessment_duration || 15;

        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="max-w-2xl w-full shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl">{job.title}</CardTitle>
                        <CardDescription className="text-lg">Technical Assessment</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-secondary/20 rounded-lg">
                                <div className="text-2xl font-bold">{questionCount}</div>
                                <div className="text-muted-foreground text-sm">Questions</div>
                            </div>
                            <div className="p-4 bg-secondary/20 rounded-lg">
                                <div className="text-2xl font-bold">{duration} min</div>
                                <div className="text-muted-foreground text-sm">Time Limit</div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 space-y-2">
                            <h4 className="font-semibold flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> Assessment Rules
                            </h4>
                            <ul className="list-disc list-inside text-sm space-y-1 ml-1">
                                <li>You must complete the assessment in one session.</li>
                                <li><strong>Do not switch tabs or windows.</strong> Doing so will trigger a warning and subsequently disqualify you.</li>
                                <li>Copying questions or pasting answers is disabled.</li>
                                <li>The assessment will auto-submit when the timer expires.</li>
                            </ul>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-center pb-8">
                        <Button size="lg" onClick={() => setStarted(true)} className="w-full max-w-sm text-lg h-12">
                            Start Assessment
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    // Assessment In-Progress
    const currentQuestion = job.technical_questions![currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === (job.technical_questions!.length - 1);
    const progress = ((currentQuestionIndex + 1) / job.technical_questions!.length) * 100;

    return (
        <div className="min-h-screen bg-muted/30 py-8 px-4 select-none" onContextMenu={(e) => e.preventDefault()}>
            {/* Warning Banner */}
            {tabSwitches > 0 && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 font-bold z-50 animate-in slide-in-from-top">
                    ⚠️ WARNING: Tab switch detected ({tabSwitches}/2). Next violation will result in disqualification.
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-6 pt-6">

                {/* Header with Timer & Progress */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between text-sm mb-1 text-muted-foreground">
                            <span>Question {currentQuestionIndex + 1} of {job.technical_questions!.length}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-md ${timeLeft! < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                        <Clock className="h-5 w-5" />
                        {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        <Flag className="h-3 w-3" />
                        Anti-Cheating Active
                    </div>
                </div>

                {/* Question Card */}
                <Card className="min-h-[400px] flex flex-col shadow-md">
                    <CardHeader className="bg-slate-50/50 border-b pb-6">
                        <CardTitle className=" text-xl leading-relaxed" onCopy={handleCopy}>
                            {currentQuestionIndex + 1}. {currentQuestion.question}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pt-6">
                        <Textarea
                            placeholder="Type your answer here..."
                            className="min-h-[250px] text-lg leading-relaxed resize-none p-4 select-text focus-visible:ring-purple-500"
                            value={answers[currentQuestionIndex] || ''}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            onPaste={handlePaste}
                            autoFocus
                        />
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6 bg-slate-50/50">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                        </Button>

                        {isLastQuestion ? (
                            <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
                                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Submit Assessment
                            </Button>
                        ) : (
                            <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                                Next <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
