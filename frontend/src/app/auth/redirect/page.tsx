'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { Loader2 } from 'lucide-react'

export default function AuthRedirectPage() {
    const router = useRouter()
    const { user, profile, loading, profileLoaded } = useAuth()
    const [redirecting, setRedirecting] = useState(false)

    useEffect(() => {
        // Wait until both auth loading is complete AND profile has been fetched
        if (loading || !profileLoaded) {
            return // Still loading, wait
        }

        if (redirecting) {
            return // Already redirecting, don't do it again
        }

        if (!user) {
            // Not logged in - go back to auth
            console.log('No user found, redirecting to /auth')
            router.push('/auth')
            return
        }

        // User is logged in and profile has been fetched
        setRedirecting(true)
        const role = profile?.role || 'candidate'
        console.log('User role:', role)

        switch (role) {
            case 'admin':
                console.log('Redirecting to /admin')
                router.push('/admin')
                break
            case 'hr':
            case 'recruiter':
                console.log('Redirecting to /hr')
                router.push('/hr')
                break
            case 'employee':
                console.log('Redirecting to /employee')
                router.push('/employee')
                break
            default:
                console.log('Redirecting to /profile')
                router.push('/profile')
        }
    }, [user, profile, loading, profileLoaded, router, redirecting])

    return (
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecting you to the right place...</p>
            {profileLoaded && profile && (
                <p className="text-xs text-muted-foreground">Role: {profile.role}</p>
            )}
        </div>
    )
}
