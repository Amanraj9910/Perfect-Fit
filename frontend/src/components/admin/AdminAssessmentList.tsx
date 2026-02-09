'use client'

import { useState } from 'react'
import { useAdminAssessments } from '../../lib/hooks/use-admin-queries'
import { Loader2, Eye, FileAudio, CheckCircle, Clock, AlertCircle, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssessmentDetail } from './AdminAssessmentDetail'
import AdminTechnicalResults from './AdminTechnicalResults'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function AdminAssessmentList() {
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'english' | 'technical'>('english')

    // Use React Query for data fetching and caching for English assessments
    const { data: assessments = [], isLoading, error } = useAdminAssessments()

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
            )}
        </div>
    )
}
