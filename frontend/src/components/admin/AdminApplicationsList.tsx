import { useState } from 'react'
import { CheckCircle, XCircle, ExternalLink, Loader2, FileText, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'
import { useAdminApplications, useUpdateApplicationStatus, useDeleteApplication } from '@/lib/hooks/use-admin-queries'
import { JobApplication, storageApi } from '@/lib/api'

export default function AdminApplicationsList() {
    const { user } = useAuth();
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState("")

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | JobApplication['status']>('all')

    // Use React Query for data fetching and caching
    const { data: applications = [], isLoading } = useAdminApplications()
    const updateStatusMutation = useUpdateApplicationStatus()
    const deleteApplicationMutation = useDeleteApplication()

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

    const handleDeleteClick = (appId: string) => {
        setSelectedAppId(appId)
        setDeleteDialogOpen(true)
    }

    const confirmReject = () => {
        if (selectedAppId) {
            updateStatus(selectedAppId, 'rejected', feedback)
        }
    }

    const confirmDelete = async () => {
        if (!selectedAppId) return
        try {
            await deleteApplicationMutation.mutateAsync(selectedAppId)
            setDeleteDialogOpen(false)
            setSelectedAppId(null)
        } catch (error) {
            console.error(error)
            alert("Failed to delete application")
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'shortlisted': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            case 'reviewing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'hired': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    const filteredApplications = applications.filter((app: JobApplication) => {
        const matchesSearch =
            (app.candidate_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (app.job_title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (app.candidate_email?.toLowerCase() || '').includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (isLoading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Job Applications</h2>
                    <p className="text-muted-foreground">Manage and review candidate applications</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm py-1 px-3">
                        Total: {applications.length}
                    </Badge>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-muted/30">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by candidate, job, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-background"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        {['all', 'submitted', 'reviewing', 'shortlisted', 'rejected', 'hired'].map((status) => (
                            <Button
                                key={status}
                                variant={statusFilter === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter(status as any)}
                                className="capitalize whitespace-nowrap"
                            >
                                {status}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {filteredApplications.length === 0 ? (
                <div className="text-center p-12 border rounded-lg bg-muted/10 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No applications found matching your criteria.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredApplications.map((app: JobApplication) => (
                        <Card key={app.id} className="overflow-hidden">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 bg-muted/10 border-b">
                                <div className="flex gap-4">
                                    <SecureAvatar
                                        src={app.candidate_avatar}
                                        fallback={app.candidate_name?.[0] || 'C'}
                                        className="h-12 w-12 border-2 border-white shadow-sm"
                                    />
                                    <div>
                                        <CardTitle className="text-lg font-semibold">{app.candidate_name || "Candidate"}</CardTitle>
                                        <CardDescription className="font-medium text-foreground/80">{app.job_title}</CardDescription>
                                        <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                                            <span>
                                                Applied: {app.created_at && !Number.isNaN(Date.parse(app.created_at))
                                                    ? new Date(app.created_at).toLocaleDateString()
                                                    : "Unknown"}
                                            </span>
                                            {app.candidate_email && <span>• {app.candidate_email}</span>}
                                            {app.phone && <span>• {app.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline" className={`${getStatusColor(app.status)} capitalize`}>
                                        {app.status}
                                    </Badge>
                                    {app.technical_assessment_completed && (
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                                            Technical Completed
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 pb-3">
                                <div className="grid md:grid-cols-2 gap-4">
                                    {app.cover_letter && (
                                        <div className="text-sm">
                                            <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block mb-1">Cover Letter</span>
                                            <div className="bg-muted/30 p-3 rounded-md text-muted-foreground italic border">
                                                "{app.cover_letter}"
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-3 text-sm">
                                            {app.resume_url && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        try {
                                                            const url = await storageApi.signUrl(app.resume_url!, true);
                                                            window.open(url, '_blank');
                                                        } catch (err) {
                                                            console.error("Failed to download resume", err);
                                                            window.open(app.resume_url, '_blank');
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-200"
                                                >
                                                    <FileText className="h-3.5 w-3.5" /> View Resume
                                                </button>
                                            )}
                                            {app.linkedin_url && (
                                                <a
                                                    href={app.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-200"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" /> LinkedIn Profile
                                                </a>
                                            )}
                                        </div>

                                        {app.status === 'rejected' && app.feedback && (
                                            <div className="text-sm bg-red-50 p-3 rounded border border-red-100">
                                                <span className="font-semibold text-xs text-red-800 uppercase tracking-wider block mb-1">Rejection Reason</span>
                                                <span className="text-red-700">"{app.feedback}"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-wrap justify-between gap-3 bg-muted/5 py-3 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-red-600 h-8"
                                    onClick={() => handleDeleteClick(app.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </Button>

                                <div className="flex gap-2">
                                    {(app.status === 'submitted' || app.status === 'reviewing') && (
                                        <>
                                            {app.status === 'submitted' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => updateStatus(app.id, 'reviewing')}
                                                    disabled={updateStatusMutation.isPending}
                                                >
                                                    Mark Reviewing
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8"
                                                onClick={() => handleRejectClick(app.id)}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                <XCircle className="h-3.5 w-3.5 mr-2" />
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 h-8"
                                                onClick={() => updateStatus(app.id, 'shortlisted')}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                {updateStatusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <CheckCircle className="h-3.5 w-3.5 mr-2" />}
                                                Shortlist
                                            </Button>
                                        </>
                                    )}
                                    {app.status === 'shortlisted' && (
                                        <Button
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 h-8"
                                            onClick={() => updateStatus(app.id, 'hired')}
                                            disabled={updateStatusMutation.isPending}
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 mr-2" />
                                            Mark Hired
                                        </Button>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Application</DialogTitle>
                        <DialogDescription>
                            Please provide feedback for the candidate. This will be visible on their dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Reason for rejection..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmReject} disabled={!feedback.trim() || updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Reject Candidate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Application</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this application? This action cannot be undone and will remove all associated data including technical assessments.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteApplicationMutation.isPending}>
                            {deleteApplicationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete Permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
