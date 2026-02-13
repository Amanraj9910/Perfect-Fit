'use client'

import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const { user, profile, loading, profileLoaded, isAdmin } = useAuth()

    useEffect(() => {
        if (!loading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (!isAdmin) {
                router.push('/auth/redirect')
            }
        }
    }, [user, isAdmin, loading, profileLoaded, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user || !isAdmin) return null

    return (
        <div className="flex min-h-screen bg-muted/10">
            <AdminSidebar />
            <main className="flex-1 overflow-auto h-screen">
                <div className="container mx-auto p-6 md:p-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    )
}
