import { useState, useEffect, useRef } from 'react'
import { adminApi } from '@/lib/api'
import { useAdminAssessmentDetail } from '@/lib/hooks/use-admin-queries'
import { uiLogger, logError } from '@/lib/logger'
import { Loader2, Play, Pause, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export function AssessmentDetail({ id }: { id: string }) {
    const { data: data, isLoading: loading, error: queryError } = useAdminAssessmentDetail(id)
    const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

    const [playingId, setPlayingId] = useState<string | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
    const handlePlayAudio = async (responseId: string) => {
        if (playingId === responseId) {
            setPlayingId(null)
            setAudioUrl(null)
            return
        }

        try {
            setPlayingId(responseId) // Show loading state
            console.log(`Fetching audio for response: ${responseId}`)

            // Always fetch fresh SAS URL from backend (stored URLs may have expired)
            const result = await adminApi.getAudioUrl(id, responseId)
            console.log('Got audio URL:', result)

            if (result?.audio_url) {
                setAudioUrl(result.audio_url)
            } else {
                console.error('No audio_url in response:', result)
                setPlayingId(null)
            }
        } catch (err) {
            console.error('Failed to fetch audio:', err)
            logError(err instanceof Error ? err : new Error('Failed to fetch audio'), 'AssessmentDetail')
            setPlayingId(null)
        }
    }

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev)
            if (next.has(sectionId)) {
                next.delete(sectionId)
            } else {
                next.add(sectionId)
            }
            return next
        })
    }

    // --- Loading & Error States ---
    if (loading) {
        return (
            <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="animate-spin inline-block mr-2" />
                Loading assessment details...
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Failed to Load Assessment</h3>
                <p className="text-sm text-muted-foreground">{error || 'Unknown error'}</p>
            </div>
        )
    }

    // --- Extract Data with Fallbacks ---
    const assessment = data.assessment || data
    const user = data.user || data.profile || {}
    const scores = data.scores || {}
    const responses = data.responses || []
    const timeline = data.timeline || []

    // Calculate overall score
    const totalScore = assessment.total_score ?? scores.total_score ?? 0
    const score = Math.round(totalScore)
    const grade = assessment.grade?.toUpperCase() || (score > 80 ? "ADVANCED" : score > 50 ? "INTERMEDIATE" : "BEGINNER")

    // Metrics configuration - maps to actual API field names
    const METRICS_CONFIG = [
        { key: 'fluency_score', label: 'Fluency', color: 'bg-blue-500', max: 20 },
        { key: 'pronunciation_score', label: 'Pronunciation', color: 'bg-green-500', max: 20 },
        { key: 'grammar_score', label: 'Grammar', color: 'bg-orange-500', max: 20 },
        { key: 'vocal_confidence_score', label: 'Vocal Confidence', color: 'bg-purple-500', max: 10 },
        { key: 'storytelling_score', label: 'Storytelling', color: 'bg-pink-500', max: 20 },
        { key: 'vision_clarity_score', label: 'Vision Clarity', color: 'bg-teal-500', max: 10 },
        { key: 'aim_clarity_score', label: 'Aim Clarity', color: 'bg-indigo-500', max: 10 },
        { key: 'hesitation_score', label: 'Hesitation', color: 'bg-red-500', max: 10, inverted: true }
    ]

    const SECTION_LABELS: Record<string, string> = {
        'introduction': '📝 Introduction',
        'reading': '📖 Reading',
        'listening': '👂 Listening',
        'storytelling': '🎭 Storytelling',
        'opinion': '💭 Opinion',
        'aim': '🎯 Aim'
    }

    // Parse details JSON if present
    const details = scores.details || {}

    // Extract strengths and weaknesses
    const strengths = scores.strengths || details.strengths || []
    const weaknesses = scores.weaknesses || details.weaknesses || []

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Assessment Details</h2>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm">
                        <span className="flex items-center gap-1">
                            ● {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                        <span>•</span>
                        <span className="uppercase">ID: {id.split('-')[0]}...</span>
                    </div>
                </div>
                <Badge
                    variant="outline"
                    className={`px-3 py-1 ${assessment.status === 'completed'
                        ? 'text-green-600 border-green-200 bg-green-50'
                        : 'text-yellow-600 border-yellow-200 bg-yellow-50'
                        }`}
                >
                    {assessment.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
            </div>

            {/* User Card */}
            <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-500">
                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">{user.full_name || 'Unknown Candidate'}</h3>
                    <p className="text-slate-500">{user.email || 'No email'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                        User since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Overall Score */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 text-white rounded-xl p-8 h-full flex flex-col justify-between shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div>
                            <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Overall Score</div>
                            <div className="flex items-end gap-2">
                                <span className="text-6xl font-bold tracking-tighter">{score}</span>
                                <span className="text-xl text-slate-500 mb-2">/ 100</span>
                            </div>
                        </div>

                        <div className="mt-12">
                            <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3">Grade</div>
                            <span className="inline-block bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-bold tracking-wide border border-slate-700">
                                {grade}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed Breakdown */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <h3 className="font-bold text-lg mb-6">Detailed Breakdown</h3>

                        {scores ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {METRICS_CONFIG.map((metric) => {
                                    const val = scores[metric.key] ?? 0
                                    const displayVal = Math.abs(val)
                                    const progress = Math.min((displayVal / metric.max) * 100, 100)

                                    // Details can be object with {score, reasoning} or just a string
                                    const detailKey = metric.key.replace('_score', '')
                                    const detailData = details[detailKey]
                                    const clarification = typeof detailData === 'object' && detailData !== null
                                        ? detailData.reasoning || detailData.text || JSON.stringify(detailData)
                                        : detailData

                                    return (
                                        <div key={metric.key} className="space-y-2">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-slate-600">{metric.label}</span>
                                                <span className="font-bold text-slate-900">
                                                    {metric.inverted ? (val < 0 ? val : `-${val}`) : val}/{metric.max}
                                                </span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                            {clarification && typeof clarification === 'string' && (
                                                <div className="mt-2 bg-slate-50 rounded-lg p-3 text-xs text-slate-600 leading-relaxed border border-slate-100">
                                                    <span className="font-bold text-slate-400 block mb-1 uppercase text-[10px]">AI Clarification:</span>
                                                    {clarification}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No scores available for this assessment.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Strengths & Weaknesses */}
            {(strengths.length > 0 || weaknesses.length > 0 || scores.overall_review) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold mb-4 text-green-700">
                            <span className="text-xl">💪</span> Strengths
                        </h4>
                        <ul className="space-y-3">
                            {strengths.length > 0 ? strengths.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="text-green-500 mt-1">•</span> {item}
                                </li>
                            )) : (
                                <li className="text-sm text-muted-foreground">No strengths recorded</li>
                            )}
                        </ul>
                    </div>
                    <div className="bg-white p-6 rounded-xl border shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold mb-4 text-red-600">
                            <span className="text-xl">🎯</span> Areas for Improvement
                        </h4>
                        <ul className="space-y-3">
                            {weaknesses.length > 0 ? weaknesses.map((item: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <span className="text-red-500 mt-1">•</span> {item}
                                </li>
                            )) : (
                                <li className="text-sm text-muted-foreground">No areas for improvement recorded</li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {/* Response Timeline */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold">Response Timeline ({responses.length} responses)</h3>

                {responses.length > 0 ? (
                    responses.map((resp: any, i: number) => {
                        const sectionName = resp.section || `Section ${i + 1}`
                        const sectionTitle = SECTION_LABELS[sectionName] || sectionName
                        const isExpanded = expandedSections.has(resp.id)

                        return (
                            <div key={resp.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                <div
                                    className="flex items-center justify-between p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-50"
                                    onClick={() => toggleSection(resp.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{sectionTitle}</div>
                                            <div className="text-xs text-slate-400">
                                                {resp.created_at ? new Date(resp.created_at).toLocaleTimeString() : 'No timestamp'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {resp.pronunciation_score && (
                                            <Badge variant="secondary" className="text-xs">
                                                Pronunciation: {resp.pronunciation_score}
                                            </Badge>
                                        )}
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-4 border-t space-y-6">

                                        {/* Audio Player */}
                                        {resp.audio_url && (
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h5 className="text-sm font-semibold text-slate-700 mb-3">🎧 Audio Recording</h5>

                                                {playingId === resp.id && !audioUrl && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Loading audio...
                                                    </div>
                                                )}

                                                {playingId === resp.id && audioUrl ? (
                                                    <audio
                                                        controls
                                                        className="w-full h-10"
                                                        src={audioUrl}
                                                        autoPlay
                                                        onEnded={() => {
                                                            setPlayingId(null)
                                                            setAudioUrl(null)
                                                        }}
                                                        onError={(e) => {
                                                            console.error('Audio error:', e)
                                                            setPlayingId(null)
                                                            setAudioUrl(null)
                                                        }}
                                                    >
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                ) : playingId !== resp.id && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handlePlayAudio(resp.id)
                                                        }}
                                                    >
                                                        <Play className="h-4 w-4" />
                                                        Load & Play Audio
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Question / Prompt</label>
                                                <div className="p-3 bg-blue-50 text-blue-900 rounded-lg text-sm font-medium">
                                                    {resp.question_text || resp.prompt || sectionTitle}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">User Response</label>
                                                <div className="p-3 bg-white border rounded-lg text-sm text-slate-700 leading-relaxed max-h-40 overflow-y-auto">
                                                    {resp.transcript || resp.user_transcript || "No transcript available."}
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI Analysis */}
                                        {resp.feedback && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">AI Analysis</label>
                                                <div className="p-3 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-lg text-sm">
                                                    {resp.feedback}
                                                </div>
                                            </div>
                                        )}


                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="bg-white border rounded-xl p-8 text-center text-muted-foreground">
                        No responses recorded for this assessment yet.
                    </div>
                )}
            </div>
        </div>
    )
}
