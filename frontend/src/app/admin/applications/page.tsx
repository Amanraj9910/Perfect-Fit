'use client'

import ApplicationList from '@/components/admin/ApplicationList'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function ApplicationsPage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && (!user || (profile?.role !== 'admin' && profile?.role !== 'hr'))) {
            router.push('/')
        }
    }, [user, profile, loading, router])

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
    }

    if (!profile || (profile.role !== 'admin' && profile.role !== 'hr')) {
        return null // Will redirect
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <ApplicationList />
        </div>
    )
}
