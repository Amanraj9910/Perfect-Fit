'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Briefcase, Loader2, LogOut, LayoutDashboard, Users, FileText } from 'lucide-react'
import { adminApi } from '@/lib/api'

import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminUserList from '@/components/admin/AdminUserList'
import AdminAssessmentList from '@/components/admin/AdminAssessmentList'
import AdminJobApprovals from '@/components/admin/AdminJobApprovals'

export default function HRPage() {
    const router = useRouter()
    const { user, profile, loading: authLoading, profileLoaded, signOut } = useAuth()
    const [stats, setStats] = useState(null)
    const [statsLoading, setStatsLoading] = useState(true)

    // Check if user is HR or Admin (Admins should also be able to see HR view if they want, or just strictly HR)
    // Strictly HR or Admin.
    const isAllowed = profile?.role === 'hr' || profile?.role === 'admin'

    useEffect(() => {
        if (!authLoading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (!isAllowed) {
                router.push('/auth/redirect')
            } else {
                fetchStats()
            }
        }
    }, [user, isAllowed, authLoading, profileLoaded])

    const fetchStats = async () => {
        try {
            const data = await adminApi.getStats()
            setStats(data)
        } catch (error) {
            console.error("Failed to fetch stats", error)
        } finally {
            setStatsLoading(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth')
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Briefcase className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-none">HR Portal</h1>
                            <p className="text-xs text-muted-foreground mt-1">Manage candidates and reviews</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium">{profile?.full_name || 'HR Specialist'}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleSignOut}>
                            <LogOut className="h-5 w-5 text-muted-foreground hover:text-purple-600" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <Tabs defaultValue="dashboard" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                        <TabsTrigger value="dashboard">
                            <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="users">
                            <Users className="h-4 w-4 mr-2" /> Candidates
                        </TabsTrigger>
                        <TabsTrigger value="assessments">
                            <FileText className="h-4 w-4 mr-2" /> Assessments
                        </TabsTrigger>
                        <TabsTrigger value="jobs">
                            <Briefcase className="h-4 w-4 mr-2" /> Jobs
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4">
                        <AdminDashboard stats={stats} loading={statsLoading} />
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <AdminUserList readonly={true} />
                    </TabsContent>

                    <TabsContent value="assessments" className="space-y-4">
                        <AdminAssessmentList />
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-4">
                        <AdminJobApprovals />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
