'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { useAuth } from '@/providers/auth-provider'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    MapPin,
    Briefcase,
    Github,
    Globe,
    Lock,
    AlertCircle,
    Plus,
    Trash2,
    Loader2,
    LogOut,
    CheckCircle
} from "lucide-react"

export default function ProfilePage() {
    const router = useRouter()
    const { user, profile, loading, profileLoaded, signOut } = useAuth()

    useEffect(() => {
        if (!loading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (profile?.role && profile.role !== 'candidate') {
                // Non-candidates should go to their respective portals
                router.push('/auth/redirect')
            }
        }
    }, [user, profile, loading, profileLoaded, router])

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth')
    }

    if (loading || !profileLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user) {
        return null // Will redirect
    }

    const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    return (
        <div className="min-h-screen bg-muted/20 pb-24">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between">
                    <Link href="/" className="font-bold text-xl flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">PF</div>
                        <span>Perfect Fit</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
                            <span>Draft saved</span>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <Avatar>
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="icon" onClick={handleSignOut}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container max-w-5xl py-8 space-y-8 px-4 sm:px-6">

                {/* 1. Profile Overview */}
                <section className="grid lg:grid-cols-[250px_1fr] gap-8">
                    <div className="space-y-6">
                        <Card className="text-center overflow-hidden">
                            <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500" />
                            <div className="relative -mt-12 mb-4 flex justify-center">
                                <Avatar className="h-24 w-24 border-4 border-background">
                                    <AvatarImage src={profile?.avatar_url || undefined} />
                                    <AvatarFallback className="text-2xl font-bold bg-muted">{initials}</AvatarFallback>
                                </Avatar>
                            </div>
                            <CardContent className="space-y-2 pb-6">
                                <h2 className="text-xl font-bold">{displayName}</h2>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    Assessment Pending
                                </Badge>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Profile Completion</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>65%</span>
                                    <span className="text-muted-foreground">Level 3/5</span>
                                </div>
                                <Progress value={65} className="h-2" />
                                <p className="text-xs text-muted-foreground pt-2">
                                    Complete "Projects" to unlock Assessment.
                                </p>
                            </CardContent>
                        </Card>

                        <Button className="w-full" disabled>
                            Start Assessment (Locked)
                            <Lock className="ml-2 h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-8 min-w-0">
                        {/* 2. About You */}
                        <Card>
                            <CardHeader>
                                <CardTitle>About You</CardTitle>
                                <CardDescription>What drives you? What are you looking for next?</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Professional Summary & Goals</Label>
                                    <Textarea
                                        placeholder="I am a product-focused engineer who loves building accessible interfaces..."
                                        className="min-h-[120px]"
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Preferred Role</Label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input className="pl-9" placeholder="e.g. Senior Frontend Engineer" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Location / Remote</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input className="pl-9" placeholder="e.g. Remote (US/Canada)" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. Skills Snapshot */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Skills Snapshot</CardTitle>
                                <CardDescription>
                                    Self-declare your confidence. These will be verified during assessment.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Badge variant="secondary" className="px-3 py-1 text-base">React / Next.js</Badge>
                                        <span className="text-sm font-medium text-muted-foreground">Expert</span>
                                    </div>
                                    <div className="w-full max-w-full overflow-hidden">
                                        <Slider defaultValue={[90]} max={100} step={1} className="w-full" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Badge variant="secondary" className="px-3 py-1 text-base">TypeScript</Badge>
                                        <span className="text-sm font-medium text-muted-foreground">Advanced</span>
                                    </div>
                                    <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <Badge variant="secondary" className="px-3 py-1 text-base">Node.js</Badge>
                                        <span className="text-sm font-medium text-muted-foreground">Intermediate</span>
                                    </div>
                                    <Slider defaultValue={[60]} max={100} step={1} className="w-full" />
                                </div>

                                <Button variant="outline" size="sm" className="w-full border-dashed">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Skill
                                </Button>
                            </CardContent>
                        </Card>

                        {/* 4. Experience & Projects */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Projects & Experience</CardTitle>
                                <CardDescription>Showcase what you've built. We value code over titles.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="border rounded-lg p-4 space-y-3 relative group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold">E-commerce Dashboard Redesign</h4>
                                            <p className="text-sm text-muted-foreground">Freelance • Jan 2023 - Mar 2023</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm">
                                        Rebuilt the merchant dashboard using Next.js 13, improving load times by 40%. Implemented complex data visualization using D3.js.
                                    </p>
                                    <div className="flex gap-3 text-sm text-blue-500">
                                        <a href="#" className="flex items-center hover:underline"><Github className="h-3 w-3 mr-1" /> Source</a>
                                        <a href="#" className="flex items-center hover:underline"><Globe className="h-3 w-3 mr-1" /> Live Demo</a>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full border-dashed h-12">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Project / Role
                                </Button>
                            </CardContent>
                        </Card>

                        {/* 5. Assessment Scorecard (LOCKED) */}
                        <div className="relative">
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl border border-dashed border-primary/20">
                                <div className="bg-background p-6 rounded-full shadow-lg mb-4">
                                    <Lock className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-center">Verified Scorecard Locked</h3>
                                <p className="text-muted-foreground mb-6 text-center max-w-sm px-4">
                                    Complete your profile and take the assessment to unlock your official skill ratings.
                                </p>
                                <Button>Unlock Assessment</Button>
                            </div>

                            {/* Blurred Background UI */}
                            <div className="grid sm:grid-cols-2 gap-4 filter blur-sm select-none opacity-50">
                                <ScoreCardPlaceholder title="Technical" score="-" />
                                <ScoreCardPlaceholder title="Communication" score="-" />
                                <ScoreCardPlaceholder title="Problem Solving" score="-" />
                                <ScoreCardPlaceholder title="Culture Fit" score="-" />
                            </div>
                        </div>

                    </div>
                </section>
            </main>
        </div>
    )
}

function ScoreCardPlaceholder({ title, score }: { title: string; score: string }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">{score}</div>
            </CardContent>
        </Card>
    )
}
