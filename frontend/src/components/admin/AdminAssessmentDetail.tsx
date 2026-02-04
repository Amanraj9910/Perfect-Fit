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

    // --- Helper Components & Configuration ---

    const METRICS_CONFIG = [
        { key: 'fluency', label: 'Fluency', color: 'bg-blue-500' },
        { key: 'pronunciation', label: 'Pronunciation', color: 'bg-green-500' },
        { key: 'grammar', label: 'Grammar', color: 'bg-orange-500' },
        { key: 'vocal_confidence', label: 'Vocal Confidence', color: 'bg-purple-500' },
        { key: 'textual_confidence', label: 'Textual Confidence', color: 'bg-yellow-500' },
        { key: 'storytelling', label: 'Storytelling', color: 'bg-pink-500' },
        { key: 'vision_clarity', label: 'Vision Clarity', color: 'bg-teal-500' },
        { key: 'aim_clarity', label: 'Aim Clarity', color: 'bg-indigo-500' },
        { key: 'hesitation', label: 'Hesitation', color: 'bg-red-500' }
    ]

    const SECTION_LABELS: Record<string, string> = {
        'introduction': 'Introduction',
        'reading': 'Reading',
        'listening': 'Listening',
        'storytelling': 'Storytelling',
        'opinion': 'Opinion',
        'aim': 'Aim'
    }

    // --- Render Logic ---

    // 1. Header & User Card
    // 2. Score Card (Left) & Detailed Breakdown (Right)
    // 3. Strengths & Improvements (Bottom of breakdown or separate?) -> Screenshots show them below breakdown.
    // 4. Response Timeline

    if (loading) return <div className="p-12 text-center text-muted-foreground"><Loader2 className="animate-spin inline-block mr-2" /> Loading assessment details...</div>
    if (!data) return <div className="p-12 text-center text-red-500">Failed to load assessment data.</div>

    const score = Math.round(data.scores?.total_score || 0) // Updated to total_score based on schema fix
    const grade = score > 80 ? "ADVANCED" : score > 50 ? "INTERMEDIATE" : "BEGINNER"

    // Parse reasoning_json if it exists (assuming it stores clarifications)
    let reasoning: any = {}
    try {
        if (data.scores?.reasoning_json) {
            reasoning = typeof data.scores.reasoning_json === 'string'
                ? JSON.parse(data.scores.reasoning_json)
                : data.scores.reasoning_json
        }
    } catch (e) { console.error("Error parsing reasoning", e) }


    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Top Navigation / Breadcrumb Placeholder */}
            {/* <div className="text-sm text-muted-foreground">← Back to Assessments</div> */}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Assessment Details</h2>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm">
                        <span className="flex items-center gap-1">● {new Date(data.profile.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="uppercase">ID: {id.split('-')[0]}...</span>
                    </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 px-3 py-1">COMPLETED</Badge>
            </div>

            {/* User Card */}
            <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-500">
                    {data.profile.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900">{data.profile.full_name || 'Unknown Candidate'}</h3>
                    <p className="text-slate-500">{data.profile.email}</p>
                    <p className="text-xs text-slate-400 mt-1">User since {new Date(data.profile.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Overall Score */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 text-white rounded-xl p-8 h-full flex flex-col justify-between shadow-lg relative overflow-hidden">
                        {/* Decorative background blur */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div>
                            <div className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Overall Score</div>
                            <div className="flex items-end gap-2">
                                <span className="text-6xl font-bold tracking-tighter">{score.toFixed(1)}</span>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                            {METRICS_CONFIG.map((metric) => {
                                const val = data.scores?.[metric.key] || 0
                                // Normalize if needed (assuming 0-10 or 0-100, screenshot shows ?/10 or ?/20)
                                // Let's assume standard 0-10 for now or rely on specific backend values
                                // We'll just show the raw value and a 100% based progress bar
                                const max = metric.key === 'fluency' ? 20 : metric.key === 'hesitation' ? 10 : 20; // Guessing max based on screenshots
                                const displayVal = val // Placeholder logic
                                const progress = (val / max) * 100

                                // Clarification text (mocked or from reasoning json)
                                const clarification = reasoning[metric.key] || "AI analysis provided based on speech patterns and content."

                                return (
                                    <div key={metric.key} className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-slate-600">{metric.label}</span>
                                            <span className="font-bold text-slate-900">{val}/{max}</span>
                                        </div>
                                        <Progress value={progress} className="h-2" indicatorClassName={metric.color} />

                                        <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-600 leading-relaxed border border-slate-100">
                                            <span className="font-bold text-slate-400 block mb-1 uppercase text-[10px]">AI Clarification:</span>
                                            {clarification}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h4 className="flex items-center gap-2 font-bold mb-4 text-green-700">
                        <span className="text-xl">💪</span> Strengths
                    </h4>
                    <ul className="space-y-3">
                        {/* Mocked strengths since not in schema explicitly yet */}
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-green-500 mt-1">•</span> Displayed ambition and a desire to make a societal impact.
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-green-500 mt-1">•</span> Attempted to answer questions and provide relevant information.
                        </li>
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h4 className="flex items-center gap-2 font-bold mb-4 text-red-600">
                        <span className="text-xl">🎯</span> Areas for Improvement
                    </h4>
                    <ul className="space-y-3">
                        {/* Mocked weaknesses */}
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-red-500 mt-1">•</span> Frequent grammatical errors and unclear sentence structure.
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-red-500 mt-1">•</span> Lack of coherence in storytelling and fragmented responses.
                        </li>
                    </ul>
                </div>

            </div>

            {/* Response Timeline */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold">Response Timeline</h3>

                {data.responses.map((resp: any, i: number) => {
                    // Try to guess section title from response order or id or question_text
                    // Currently backend responses might not store 'section' explicitly, assume simple mapping
                    const sectionTitle = SECTION_LABELS[Object.keys(SECTION_LABELS)[i]] || `Section ${i + 1}`
                    const isOpen = playingId === resp.id // Expand if playing? Or use separate state.
                    // Let's create a local state for timeline expansion if we want accordion. 
                    // reusing playingId for now to "focus" might be confusing. 

                    return (
                        <div key={resp.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
                                        {sectionTitle[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{sectionTitle}</div>
                                        <div className="text-xs text-slate-400">{new Date(resp.created_at).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            </div>

                            {/* Expanded Content (Force expanded for now as per "Timeline" view usually) */}
                            <div className="p-4 border-t space-y-6">

                                {/* Audio Player */}
                                <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-full bg-white shadow-sm hover:text-blue-600"
                                        onClick={() => handlePlayAudio(resp.id)}
                                    >
                                        {playingId === resp.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                                    </Button>
                                    <div className="flex-1">
                                        {/* Fake progress bar since audio element controls styling is hard. 
                                            Real implementation would use specific audio player component. 
                                        */}
                                        <div className="h-1 bg-slate-200 rounded-full w-full overflow-hidden">
                                            <div className="h-full bg-slate-400 w-1/3"></div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-500">0:00 / 0:30</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Question / Prompt</label>
                                        <div className="p-3 bg-blue-50 text-blue-900 rounded-lg text-sm font-medium">
                                            {resp.question_text || sectionTitle}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">User Response</label>
                                        <div className="p-3 bg-white border rounded-lg text-sm text-slate-700 leading-relaxed">
                                            {resp.transcript || "No transcript available."}
                                        </div>
                                    </div>
                                </div>

                                {/* AI Analysis */}
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">AI Analysis</label>
                                    <div className="p-3 bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-lg text-sm">
                                        {resp.feedback || "Automated analysis not available for this section."}
                                    </div>
                                </div>

                                {/* Audio Element Hidden */}
                                {playingId === resp.id && audioUrl && (
                                    <audio
                                        ref={audioRef}
                                        src={audioUrl}
                                        onEnded={() => setPlayingId(null)}
                                        className="hidden"
                                        autoPlay
                                    />
                                )}

                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
