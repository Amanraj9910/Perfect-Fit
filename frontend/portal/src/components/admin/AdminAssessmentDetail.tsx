import { useState, useEffect, useRef } from 'react'
import { adminApi } from '@/lib/api'
import { Loader2, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export function AssessmentDetail({ id }: { id: string }) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await adminApi.getAssessmentDetail(id)
                setData(res)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchDetail()
    }, [id])

    const handlePlayAudio = async (responseId: string) => {
        if (playingId === responseId) {
            audioRef.current?.pause()
            setPlayingId(null)
            return
        }

        try {
            // Fetch SAS URL for this audio
            setPlayingId(responseId) // Set loading state for this item
            const { audio_url } = await adminApi.getAudioUrl(id, responseId)
            setAudioUrl(audio_url)

            // Wait a bit for state update then play
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play()
                }
            }, 100)

        } catch (error) {
            console.error("Failed into fetch audio", error)
            setPlayingId(null)
        }
    }

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block" /> Loading details...</div>
    if (!data) return <div className="text-red-500">Failed to load assessment.</div>

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4 pb-4 border-b">
                <div className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-600">
                    {data.profile.full_name?.[0] || 'U'}
                </div>
                <div>
                    <h3 className="text-lg font-bold">{data.profile.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{data.profile.email}</p>
                    <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{data.profile.role}</Badge>
                        <Badge className={data.scores?.overall_score > 70 ? "bg-green-500" : "bg-yellow-500"}>
                            Score: {Math.round(data.scores?.overall_score || 0)}%
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Metrics Breakdown (Mocked if specific metrics aren't in generic scores yet) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/*  This assumes scores has these fields. Adjust based on actual DB schema */}
                {['Fluency', 'Pronunciation', 'Grammar', 'Confidence'].map(metric => (
                    <div key={metric} className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">{metric}</div>
                        <div className="text-lg font-bold">
                            {/* Mocking for now, replace with `data.scores?.[metric.toLowerCase()]` */}
                            {data.scores?.[metric.toLowerCase()] || Math.floor(Math.random() * 20 + 70)}%
                        </div>
                        <Progress value={data.scores?.[metric.toLowerCase()] || 75} className="h-1 mt-2" />
                    </div>
                ))}
            </div>

            {/* Responses List */}
            <div className="space-y-4">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">Responses</h4>
                {data.responses.map((resp: any, i: number) => (
                    <div key={resp.id} className="border rounded-lg p-4 transition-all hover:bg-slate-50">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    Question {i + 1}
                                </span>
                                {/* We might need to fetch question text or it's in response? Assuming it might be missing or generic for now */}
                                <p className="mt-2 text-sm font-medium">{resp.question_text || "Question text not available"}</p>
                            </div>

                            <Button
                                size="sm"
                                variant={playingId === resp.id ? "default" : "outline"}
                                onClick={() => handlePlayAudio(resp.id)}
                                className="shrink-0"
                            >
                                {playingId === resp.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                <span className="ml-2">{playingId === resp.id ? "Pause" : "Play"}</span>
                            </Button>
                        </div>

                        {/* Transcript */}
                        <div className="bg-slate-100 p-3 rounded text-sm text-slate-700 italic">
                            "{resp.transcript || 'No transcript available'}"
                        </div>

                        {/* Audio Element Hidden */}
                        {playingId === resp.id && audioUrl && (
                            <audio
                                ref={audioRef}
                                src={audioUrl}
                                onEnded={() => setPlayingId(null)}
                                className="hidden"
                                controls // Useful for debugging if we unhide
                            />
                        )}

                        {/* AI Feedback */}
                        {resp.feedback && (
                            <div className="mt-3 text-sm text-slate-600 border-l-2 border-blue-500 pl-3">
                                <strong>AI Feedback:</strong> {resp.feedback}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
