'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth-provider'
import { useAdminStats } from '@/lib/hooks/use-admin-queries'
import { subscribeToAdminUpdates } from '@/lib/realtime'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Loader2, LogOut, LayoutDashboard, Users, FileText, Briefcase } from 'lucide-react'

import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminUserList from '@/components/admin/AdminUserList'
import AdminAssessmentList from '@/components/admin/AdminAssessmentList'
import AdminJobApprovals from '@/components/admin/AdminJobApprovals'
import AdminApplicationsList from '@/components/admin/AdminApplicationsList'
import { AdminTechnicalResults } from '@/components/admin/AdminTechnicalResults'

export default function AdminPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { user, profile, loading: authLoading, profileLoaded, signOut, isAdmin } = useAuth()

    // Use React Query for stats - cached across tab switches
    const { data: stats, isLoading: statsLoading } = useAdminStats()

    // Subscribe to realtime updates for live data sync
    useEffect(() => {
        if (!user || !isAdmin) return

        const cleanup = subscribeToAdminUpdates(queryClient, (message) => {
            console.log('[Realtime]', message)
            // TODO: Add toast notification - install sonner: npm install sonner
        })

        return cleanup
    }, [user, isAdmin, queryClient])

    useEffect(() => {
        if (!authLoading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (!isAdmin) {
                router.push('/auth/redirect')
            }
        }
    }, [user, isAdmin, authLoading, profileLoaded, router])

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
                        <div className="bg-red-100 p-2 rounded-lg">
                            <Shield className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-none">Admin Portal</h1>
                            <p className="text-xs text-muted-foreground mt-1">Manage users and assessments</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium">{profile?.full_name || 'Admin'}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleSignOut}>
                            <LogOut className="h-5 w-5 text-muted-foreground hover:text-red-600" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <Tabs defaultValue="dashboard" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 lg:w-[650px]">
                        <TabsTrigger value="dashboard">
                            <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="users">
                            <Users className="h-4 w-4 mr-2" /> Users
                        </TabsTrigger>
                        <TabsTrigger value="assessments">
                            <FileText className="h-4 w-4 mr-2" /> Assessments
                        </TabsTrigger>
                        <TabsTrigger value="jobs">
                            <Briefcase className="h-4 w-4 mr-2" /> Jobs
                        </TabsTrigger>
                        <TabsTrigger value="applications">
                            <FileText className="h-4 w-4 mr-2" /> Applications
                        </TabsTrigger>
                        <TabsTrigger value="technical">
                            <FileText className="h-4 w-4 mr-2" /> Tech. Results
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4">
                        <AdminDashboard stats={stats} loading={statsLoading} />
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <AdminUserList />
                    </TabsContent>

                    <TabsContent value="assessments" className="space-y-4">
                        <AdminAssessmentList />
                    </TabsContent>

                    <TabsContent value="jobs" className="space-y-4">
                        <AdminJobApprovals />
                    </TabsContent>

                    <TabsContent value="applications" className="space-y-4">
                        <AdminApplicationsList />
                    </TabsContent>

                    <TabsContent value="technical" className="space-y-4">
                        <AdminTechnicalResults />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
