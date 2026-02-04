"use client"

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, ExternalLink, MessageSquare, Loader2, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/providers/auth-provider'

interface Application {
    id: string
    job_id: string
    applicant_id: string
    job_title: string
    status: string
    cover_letter: string
    resume_url: string
    phone?: string
    linkedin_url?: string
    created_at: string
    // Enriched fields
    candidate_name?: string
    candidate_email?: string
    candidate_avatar?: string
}

export default function AdminApplicationsList() {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState("")

    useEffect(() => {
        fetchApplications()
    }, [user])

    const fetchApplications = async () => {
        if (!user) return;
        setLoading(true)
        try {
            // In a real app we might fetch these from our backend API which joins data
            // We implemented GET /api/applications which returns apps + job_title
            // But it doesn't return candidate name/email yet (comment in code said "fetch profile separately").
            // For MVP, we can fetch apps, then fetch profile for each if needed, or rely on what's available.
            // Or update backend to join.

            // Let's use the backend endpoint we made.
            const token = (await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }: { data: any }) => data.session?.access_token);

            const res = await fetch("http://localhost:8000/api/applications", {
                headers: {
                    "X-Supabase-Auth": (await token) || ""
                }
            });

            if (res.ok) {
                const data = await res.json();
                // We need candidate details. 
                // We can fetch them or assume backend provides them if updated.
                // Currently backend only provides job_title.
                // Let's fetch candidate profiles client side for now to be fast.
                // Or just show ID? User wants "see all details of candidate".

                // Enrich with profile data
                const supabase = (await import("@/lib/supabase")).getSupabaseClient();

                const enriched = await Promise.all(data.map(async (app: any) => {
                    // Fetch profile for applicant_id
                    const { data: profile } = await supabase.from('candidate_profiles').select('full_name, email, profile_pic_url').eq('id', app.applicant_id).single();
                    // If not in candidate_profiles, try generic profiles
                    let name = "Unknown Candidate";
                    let email = "";
                    let avatar = "";

                    if (profile) {
                        name = profile.full_name;
                        email = profile.email;
                        avatar = profile.profile_pic_url;
                    } else {
                        const { data: userProfile } = await supabase.from('profiles').select('full_name, email, avatar_url').eq('id', app.applicant_id).single();
                        if (userProfile) {
                            name = userProfile.full_name;
                            email = userProfile.email;
                            avatar = userProfile.avatar_url;
                        }
                    }

                    return {
                        ...app,
                        candidate_name: name,
                        candidate_email: email,
                        candidate_avatar: avatar
                    };
                }));

                setApplications(enriched);
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (appId: string, status: string, feedbackText?: string) => {
        setProcessingId(appId)
        try {
            const token = (await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }: { data: any }) => data.session?.access_token);

            const res = await fetch(`http://localhost:8000/api/applications/${appId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-Supabase-Auth": (await token) || ""
                },
                body: JSON.stringify({
                    status: status,
                    feedback: feedbackText
                })
            });

            if (!res.ok) throw new Error("Failed to update status");

            // Update local state
            setApplications(apps => apps.map(a => a.id === appId ? { ...a, status: status, feedback: feedbackText } : a));

        } catch (error) {
            console.error(error);
            alert("Failed to update status");
        } finally {
            setProcessingId(null)
            setRejectDialogOpen(false)
            setFeedback("")
            setSelectedAppId(null)
        }
    }

    const handleRejectClick = (appId: string) => {
        setSelectedAppId(appId)
        setRejectDialogOpen(true)
    }

    const confirmReject = () => {
        if (selectedAppId) {
            updateStatus(selectedAppId, 'rejected', feedback)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'shortlisted': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'reviewing': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Job Applications</h2>
            {applications.length === 0 ? (
                <div className="text-center p-12 border rounded-lg bg-muted/10 text-muted-foreground">
                    No applications found.
                </div>
            ) : (
                <div className="grid gap-4">
                    {applications.map(app => (
                        <Card key={app.id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                <div className="flex gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={app.candidate_avatar} />
                                        <AvatarFallback>{app.candidate_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base font-semibold">{app.candidate_name || "Candidate"}</CardTitle>
                                        <CardDescription className="text-sm">{app.job_title}</CardDescription>
                                        <div className="mt-1 text-xs text-muted-foreground flex gap-2">
                                            <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                                            {app.phone && <span>• {app.phone}</span>}
                                            {app.candidate_email && <span>• {app.candidate_email}</span>}
                                        </div>
                                    </div>
                                </div>
                                <Badge variant="outline" className={getStatusColor(app.status)}>
                                    {app.status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="py-2">
                                {app.cover_letter && (
                                    <div className="text-sm text-muted-foreground mb-3 bg-muted/20 p-3 rounded">
                                        "{app.cover_letter}"
                                    </div>
                                )}
                                <div className="flex gap-3 text-sm">
                                    {app.resume_url && (
                                        <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                            <FileText className="h-4 w-4 mr-1" /> Resume
                                        </a>
                                    )}
                                    {app.linkedin_url && (
                                        <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                            <ExternalLink className="h-4 w-4 mr-1" /> LinkedIn
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 bg-muted/5 py-3">
                                {app.status === 'submitted' || app.status === 'reviewing' ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRejectClick(app.id)}
                                            disabled={processingId === app.id}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Discard
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => updateStatus(app.id, 'shortlisted')}
                                            disabled={processingId === app.id}
                                        >
                                            {processingId === app.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                            Next Stage
                                        </Button>
                                    </>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">Processed</span>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Discard Application</DialogTitle>
                        <DialogDescription>
                            Please provide feedback for the candidate. This will be visible on their dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Reason for rejection..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmReject} disabled={!feedback.trim() || !!processingId}>
                            {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Discard Application"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
