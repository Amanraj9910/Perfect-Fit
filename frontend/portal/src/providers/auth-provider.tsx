'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient, getSupabaseClient } from '@/lib/supabase'

type UserRole = 'candidate' | 'employee' | 'hr' | 'recruiter' | 'admin'

interface Profile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    role: UserRole
}

interface AuthContextType {
    user: User | null
    profile: Profile | null
    session: Session | null
    loading: boolean
    profileLoaded: boolean  // New: indicates profile fetch attempt completed
    isAdmin: boolean
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
    signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
    signInWithGoogle: () => Promise<{ error: AuthError | null }>
    signInWithAzure: () => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create client once at module level using singleton
const supabase = getSupabaseClient()

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileLoaded, setProfileLoaded] = useState(false)

    async function fetchProfile(userId: string): Promise<Profile | null> {
        setProfileLoaded(false)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, role')
            .eq('id', userId)
            .single()

        setProfileLoaded(true)

        if (error) {
            console.error('Error fetching profile:', error)
            return null
        }
        return data as Profile
    }

    async function refreshProfile(): Promise<void> {
        if (user) {
            const profileData = await fetchProfile(user.id)
            setProfile(profileData)
        }
    }

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
            const currentSession = data.session
            setSession(currentSession)
            setUser(currentSession?.user ?? null)

            if (currentSession?.user) {
                const profileData = await fetchProfile(currentSession.user.id)
                setProfile(profileData)
            } else {
                setProfileLoaded(true) // No user, no profile to load
            }
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, newSession: Session | null) => {
                setSession(newSession)
                setUser(newSession?.user ?? null)

                if (newSession?.user) {
                    const profileData = await fetchProfile(newSession.user.id)
                    setProfile(profileData)
                } else {
                    setProfile(null)
                    setProfileLoaded(true)
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function signInWithEmail(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }

    async function signUpWithEmail(email: string, password: string, fullName?: string) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        })
        return { error }
    }

    async function signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        })
        return { error }
    }

    async function signInWithAzure() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'email openid profile'
            }
        })
        return { error }
    }

    async function signOut() {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setSession(null)
    }

    const isAdmin = !!(profile?.role && ['admin', 'hr', 'recruiter'].includes(profile.role))

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            session,
            loading,
            profileLoaded,
            isAdmin,
            signInWithEmail,
            signUpWithEmail,
            signInWithGoogle,
            signInWithAzure,
            signOut,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
