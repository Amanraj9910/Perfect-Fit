import { useState } from 'react'
import { useAdminAssessments } from '@/lib/hooks/use-admin-queries'
import { Loader2, Eye, FileAudio, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssessmentDetail } from './AdminAssessmentDetail'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function AdminAssessmentList() {
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)

    // Use React Query for data fetching and caching
    const { data: assessments = [], isLoading, error } = useAdminAssessments()

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Failed to Load Assessments</h3>
                    <p className="text-sm text-muted-foreground">
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    Try Again
                </Button>
            </div>
        )
    }

    return (
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

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedAssessmentId(assessment.id)}
                            >
                                <Eye className="h-4 w-4 mr-2" />View
                            </Button>
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
                    </DialogHeader>
                    {selectedAssessmentId && (
                        <AssessmentDetail id={selectedAssessmentId} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
