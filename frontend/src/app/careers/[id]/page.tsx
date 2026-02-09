'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { jobsApi, JobRole, ApplicationInput } from '@/lib/api'
import { useJob } from '@/lib/hooks/use-jobs'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Briefcase,
    ArrowLeft,
    Clock,
    Building,
    CheckCircle,
    Loader2,
    Send,
    User,
    Mail,
    Phone,
    Linkedin
} from 'lucide-react'

export default function JobDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { user, profile } = useAuth()
    const jobId = params.id as string

    // Use React Query hook for job details
    const { data: job, isLoading: loading, error: queryError } = useJob(jobId)
    const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load job details' : null

    // Application state
    const [showApplicationForm, setShowApplicationForm] = useState(false)
    const [applying, setApplying] = useState(false)
    const [applicationSuccess, setApplicationSuccess] = useState(false)
    const [applicationError, setApplicationError] = useState<string | null>(null)

    // Form fields
    const [coverLetter, setCoverLetter] = useState('')
    const [phone, setPhone] = useState('')
    const [linkedinUrl, setLinkedinUrl] = useState('')

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault()
        setApplying(true)
        setApplicationError(null)

        try {
            await jobsApi.apply(jobId, {
                cover_letter: coverLetter || undefined,
                phone: phone || undefined,
                linkedin_url: linkedinUrl || undefined
            })
            setApplicationSuccess(true)
            setShowApplicationForm(false)
        } catch (err) {
            console.error('Error applying:', err)
            setApplicationError(err instanceof Error ? err.message : 'Failed to submit application')
        } finally {
            setApplying(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !job) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="py-8 text-center">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                        <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        <Link href="/careers">
                            <Button>Browse All Jobs</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/careers" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm">Back to Careers</span>
                        </Link>
                        {!user && (
                            <Link href="/auth">
                                <Button variant="outline">Sign In to Apply</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Job Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                        <Briefcase className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Building className="h-4 w-4" />
                                                {job.department}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                Posted {new Date(job.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">About This Role</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Requirements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Application Panel */}
                    <div className="space-y-6">
                        {applicationSuccess ? (
                            <Card className="border-green-200 bg-green-50">
                                <CardContent className="py-8 text-center">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                                        Application Submitted!
                                    </h3>
                                    <p className="text-green-700">
                                        Thank you for your interest. We'll review your application and get back to you soon.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="sticky top-24">
                                <CardHeader>
                                    <CardTitle>Apply for this Position</CardTitle>
                                    <CardDescription>
                                        {user
                                            ? 'Complete the form below to submit your application'
                                            : 'Sign in to apply for this position'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!user ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-muted-foreground">
                                                Create an account or sign in to submit your application.
                                            </p>
                                            <Link href="/auth" className="block">
                                                <Button className="w-full">
                                                    Sign In / Register
                                                </Button>
                                            </Link>
                                        </div>
                                    ) : showApplicationForm ? (
                                        <form onSubmit={handleApply} className="space-y-4">
                                            {applicationError && (
                                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                                    {applicationError}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    Name
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={profile?.full_name || ''}
                                                    disabled
                                                    className="bg-muted"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    Email
                                                </Label>
                                                <Input
                                                    id="email"
                                                    value={profile?.email || user.email || ''}
                                                    disabled
                                                    className="bg-muted"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="phone" className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    Phone (optional)
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    placeholder="+1 (555) 000-0000"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="linkedin" className="flex items-center gap-1">
                                                    <Linkedin className="h-3 w-3" />
                                                    LinkedIn Profile (optional)
                                                </Label>
                                                <Input
                                                    id="linkedin"
                                                    type="url"
                                                    placeholder="https://linkedin.com/in/yourprofile"
                                                    value={linkedinUrl}
                                                    onChange={(e) => setLinkedinUrl(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="coverLetter">Cover Letter (optional)</Label>
                                                <Textarea
                                                    id="coverLetter"
                                                    placeholder="Tell us why you're interested in this role..."
                                                    rows={5}
                                                    value={coverLetter}
                                                    onChange={(e) => setCoverLetter(e.target.value)}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => setShowApplicationForm(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    className="flex-1"
                                                    disabled={applying}
                                                >
                                                    {applying ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="h-4 w-4 mr-2" />
                                                            Submit
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            onClick={() => setShowApplicationForm(true)}
                                        >
                                            Apply Now
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
