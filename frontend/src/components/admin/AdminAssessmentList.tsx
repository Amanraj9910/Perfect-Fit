import { useState } from 'react'
import { toast } from "sonner"
import { useAdminAssessments, useDeleteAssessment } from '../../lib/hooks/use-admin-queries'
import { Loader2, Eye, FileAudio, CheckCircle, Clock, AlertCircle, FileCode, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssessmentDetail } from './AdminAssessmentDetail'
import AdminTechnicalResults from './AdminTechnicalResults'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function AdminAssessmentList() {
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
    const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'english' | 'technical'>('english')

    // Use React Query for data fetching and caching for English assessments
    const { data: assessments = [], isLoading, error } = useAdminAssessments()
    const deleteMutation = useDeleteAssessment()

    const handleDelete = async () => {
        if (!assessmentToDelete) return
        try {
            await deleteMutation.mutateAsync(assessmentToDelete)
            setAssessmentToDelete(null)
            toast.success("Assessment deleted successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to delete assessment")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Assessments</h2>
                <div className="bg-muted p-1 rounded-lg inline-flex">
                    <Button
                        variant={activeTab === 'english' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('english')}
                        className="h-8"
                    >
                        <FileAudio className="h-4 w-4 mr-2" /> English
                    </Button>
                    <Button
                        variant={activeTab === 'technical' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('technical')}
                        className="h-8"
                    >
                        <FileCode className="h-4 w-4 mr-2" /> Technical
                    </Button>
                </div>
            </div>

            {activeTab === 'technical' ? (
                <AdminTechnicalResults />
            ) : (
                <div className="space-y-4">
                    <div className="rounded-md border bg-white divide-y">
                        {assessments.map((assessment: any) => (
                            <div key={assessment.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <FileAudio className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{assessment.user_name || 'Anonymous'}</p>
                                        <p className="text-sm text-muted-foreground">{assessment.user_email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="text-sm font-medium">
                                            {assessment.overall_score ? `${Math.round(assessment.overall_score)}%` : 'N/A'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Score</div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {assessment.status === 'completed' ? (
                                            <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                <CheckCircle className="h-3 w-3 mr-1" /> Completed
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                                <Clock className="h-3 w-3 mr-1" /> {assessment.status}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedAssessmentId(assessment.id)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />View
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setAssessmentToDelete(assessment.id)}
                                            disabled={deleteMutation.isPending}
                                            className="text-muted-foreground hover:text-red-600 w-8 h-8"
                                            title="Delete Assessment"
                                        >
                                            {deleteMutation.isPending && assessmentToDelete === assessment.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {assessments.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">No assessments found.</div>
                        )}
                    </div>

                    <Dialog open={!!selectedAssessmentId} onOpenChange={(open) => !open && setSelectedAssessmentId(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Assessment Details</DialogTitle>
                                <DialogDescription className="hidden">
                                    Detailed view of the candidate's assessment performance.
                                </DialogDescription>
                            </DialogHeader>
                            {selectedAssessmentId && (
                                <AssessmentDetail id={selectedAssessmentId} />
                            )}
                        </DialogContent>
                    </Dialog>

                    <Dialog open={!!assessmentToDelete} onOpenChange={(open) => !open && setAssessmentToDelete(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Assessment</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete this assessment? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAssessmentToDelete(null)}>Cancel</Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    )
}
