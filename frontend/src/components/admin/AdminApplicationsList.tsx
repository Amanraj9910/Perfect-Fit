import { useState } from 'react'
import { CheckCircle, XCircle, ExternalLink, Loader2, FileText } from 'lucide-react'
import { SecureAvatar } from '@/components/ui/secure-avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useAdminApplications, useUpdateApplicationStatus } from '@/lib/hooks/use-admin-queries'
import { JobApplication } from '@/lib/api'

export default function AdminApplicationsList() {
    const { user } = useAuth();
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState("")

    // Use React Query for data fetching and caching
    const { data: applications = [], isLoading } = useAdminApplications()
    const updateStatusMutation = useUpdateApplicationStatus()

    const updateStatus = async (appId: string, status: JobApplication['status'], feedbackText?: string) => {
        try {
            await updateStatusMutation.mutateAsync({ id: appId, status, feedback: feedbackText })
            setRejectDialogOpen(false)
            setFeedback("")
            setSelectedAppId(null)
        } catch (error) {
            console.error(error);
            alert("Failed to update status");
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

    if (isLoading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Job Applications</h2>
            {applications.length === 0 ? (
                <div className="text-center p-12 border rounded-lg bg-muted/10 text-muted-foreground">
                    No applications found.
                </div>
            ) : (
                <div className="grid gap-4">
                    {applications.map((app: JobApplication) => (
                        <Card key={app.id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                <div className="flex gap-4">
                                    <SecureAvatar
                                        src={app.candidate_avatar}
                                        fallback={app.candidate_name?.[0] || 'C'}
                                        className="h-10 w-10"
                                    />
                                    <div>
                                        <CardTitle className="text-base font-semibold">{app.candidate_name || "Candidate"}</CardTitle>
                                        <CardDescription className="text-sm">{app.job_title}</CardDescription>
                                        <div className="mt-1 text-xs text-muted-foreground flex gap-2">
                                            <span>
                                                Applied: {app.created_at && !Number.isNaN(Date.parse(app.created_at))
                                                    ? new Date(app.created_at).toLocaleDateString()
                                                    : "Unknown"}
                                            </span>
                                            {app.phone && <span>- {app.phone}</span>}
                                            {app.candidate_email && <span>- {app.candidate_email}</span>}
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
                                        <span className="font-semibold text-xs block mb-1">Cover Letter:</span>
                                        "{app.cover_letter}"
                                    </div>
                                )}
                                {app.status === 'rejected' && app.feedback && (
                                    <div className="text-sm text-red-600 mb-3 bg-red-50 p-3 rounded border border-red-100">
                                        <span className="font-semibold text-xs block mb-1">Feedback:</span>
                                        "{app.feedback}"
                                    </div>
                                )}
                                <div className="flex gap-3 text-sm">
                                    {app.resume_url && (
                                        <button
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                try {
                                                    const { storageApi } = await import("@/lib/api");
                                                    const url = await storageApi.signUrl(app.resume_url!, true);
                                                    window.open(url, '_blank');
                                                } catch (err) {
                                                    console.error("Failed to download resume", err);
                                                    window.open(app.resume_url, '_blank');
                                                }
                                            }}
                                            className="flex items-center text-blue-600 hover:underline focus:outline-none"
                                        >
                                            <FileText className="h-4 w-4 mr-1" /> Resume
                                        </button>
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
                                            disabled={updateStatusMutation.isPending}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Discard
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => updateStatus(app.id, 'shortlisted')}
                                            disabled={updateStatusMutation.isPending}
                                        >
                                            {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
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
                        <Button variant="destructive" onClick={confirmReject} disabled={!feedback.trim() || updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Discard Application"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
