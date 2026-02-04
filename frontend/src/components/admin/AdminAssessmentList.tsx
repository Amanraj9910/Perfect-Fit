import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/api'
import { Loader2, Eye, FileAudio, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssessmentDetail } from './AdminAssessmentDetail'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function AdminAssessmentList() {
    const [assessments, setAssessments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)

    useEffect(() => {
        const fetchAssessments = async () => {
            try {
                const data = await adminApi.getAssessments()
                setAssessments(data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchAssessments()
    }, [])

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-white divide-y">
                {assessments.map((assessment) => (
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
                                <Eye className="h-4 w-4 mr-2" /> View
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
