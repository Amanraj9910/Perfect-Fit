'use client'

import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronDown, ChevronUp, AlertCircle, FileCode, CheckCircle, Trash2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useDeleteApplication, useTechnicalResults, GroupedAssessment, TechnicalResult } from '@/lib/hooks/use-admin-queries'
import { toast } from "sonner"



interface AdminTechnicalResultsProps {
    applicationId?: string
}

export default function AdminTechnicalResults({ applicationId }: AdminTechnicalResultsProps) {
    const [expandedAppId, setExpandedAppId] = useState<string | null>(null)
    const [appToDelete, setAppToDelete] = useState<string | null>(null)

    // Use React Query Hook
    const { data: grouped = [], isLoading: loading, refetch } = useTechnicalResults(applicationId)
    const deleteApplicationMutation = useDeleteApplication()

    // No useEffect needed!


    const toggleExpand = (appId: string) => {
        setExpandedAppId(expandedAppId === appId ? null : appId)
    }

    const confirmDelete = async () => {
        if (!appToDelete) return
        try {
            await deleteApplicationMutation.mutateAsync(appToDelete)
            setAppToDelete(null)
            toast.success("Application deleted successfully")
            // Query invalidation handles refresh
        } catch (error) {
            console.error(error)
            toast.error("Failed to delete application")
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (grouped.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-md bg-muted/5">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No technical assessments found.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* List View matching AdminAssessmentList style */}
            <div className="rounded-md border bg-white divide-y">
                {grouped.map((group) => (
                    <div key={group.application_id} className="flex flex-col">
                        <div
                            className="flex items-center justify-between p-4"
                        >
                            <div
                                className="flex items-center gap-4 cursor-pointer flex-1"
                                onClick={() => toggleExpand(group.application_id)}
                            >
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <FileCode className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium">{group.candidate_name}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>{group.job_title}</span>
                                        <span>•</span>
                                        <span>{new Date(group.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right min-w-[60px]">
                                    <div className="text-sm font-medium">
                                        {group.status === 'pending' ? '-' : `${group.average_score?.toFixed(1)}/10`}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Avg Score</div>
                                </div>

                                <div className="min-w-[100px] flex justify-end">
                                    {group.status === 'completed' ? (
                                        <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                            <CheckCircle className="h-3 w-3 mr-1" /> Completed
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analyzing
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(group.application_id)}>
                                        {expandedAppId === group.application_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-red-600"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setAppToDelete(group.application_id)
                                        }}
                                        title="Delete Assessment (and Application)"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedAppId === group.application_id && (
                            <div className="p-4 bg-muted/20 border-t">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-base">Detailed Results</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40%]">Question</TableHead>
                                                    <TableHead className="w-[10%]">Score</TableHead>
                                                    <TableHead>Reasoning</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {group.results.map((result) => (
                                                    <TableRow key={result.id}>
                                                        <TableCell className="align-top">
                                                            <div className="font-medium text-sm mb-1">{result.question_text}</div>
                                                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                                                <span className="font-semibold">Answer: </span>
                                                                {result.answer}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            {result.ai_score === null ? (
                                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 aspect-square h-8 w-8 flex items-center justify-center p-0">
                                                                    -
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant={result.ai_score >= 7 ? "default" : result.ai_score >= 4 ? "secondary" : "destructive"}
                                                                    className="aspect-square h-8 w-8 flex items-center justify-center p-0"
                                                                >
                                                                    {result.ai_score}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="align-top text-sm text-muted-foreground whitespace-pre-wrap">
                                                            {result.ai_reasoning || "Pending analysis..."}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Dialog open={!!appToDelete} onOpenChange={(open) => !open && setAppToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Technical Assessment?</DialogTitle>
                        <DialogDescription>
                            Warning: This will delete the entire Job Application and all associated data for this candidate. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAppToDelete(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteApplicationMutation.isPending}
                        >
                            {deleteApplicationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete Application"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
