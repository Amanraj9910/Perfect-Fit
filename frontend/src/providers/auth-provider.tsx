'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient, getSupabaseClient } from '@/lib/supabase'
import { toast } from "sonner"

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
    const router = useRouter()

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
        console.log("Profile fetched successfully:", data);
        return data as Profile
    }

    async function refreshProfile(): Promise<void> {
        if (user) {
            const profileData = await fetchProfile(user.id)
            setProfile(profileData)
        }
    }

    useEffect(() => {
        // Get initial session and user securely
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setSession(session)

                // Use getUser() to get the user object securely to avoid warning
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user) {
                    // Force a refresh to ensure server components (cookies) match client state
                    router.refresh()
                    try {
                        const profileData = await fetchProfile(user.id)
                        setProfile(profileData)
                    } catch (err) {
                        console.error("Profile fetch failed in initAuth:", err)
                    }
                } else {
                    setProfileLoaded(true) // No user, no profile to load
                }
            } catch (e) {
                console.error("Auth initialization failed:", e)
            } finally {
                setLoading(false)
            }
        }

        initAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, newSession: Session | null) => {
                try {
                    setSession(newSession)

                    if (newSession) {
                        const { data: { user } } = await supabase.auth.getUser()
                        setUser(user)
                        if (user) {
                            try {
                                const profileData = await fetchProfile(user.id)
                                setProfile(profileData)
                            } catch (err) {
                                console.error("Profile fetch failed in auth change:", err)
                            }
                        } else {
                            setProfile(null)
                            setProfileLoaded(true)
                        }
                    } else {
                        setUser(null)
                        setProfile(null)
                        setProfileLoaded(true)
                    }
                } catch (e) {
                    console.error("Auth change handler failed:", e)
                } finally {
                    setLoading(false)
                }
            }
        )

        return () => subscription.unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const signInWithEmail = async (email: string, password: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (data.session) {
                setSession(data.session)
                setUser(data.session.user)
                // Reset profile loaded state so consumers know to wait
                setProfileLoaded(false)

                // Trigger profile fetch immediately and wait for it
                // We use a try-catch here specifically for profile fetch to not break the login if profile fails
                try {
                    const profile = await fetchProfile(data.session.user.id);
                    setProfile(profile);
                } catch (profileError) {
                    console.error("Profile fetch failed during login:", profileError);
                    // proceeding without profile, keeping user
                }

                toast.success("Signed in successfully")
            } else if (error) {
                toast.error(error.message)
            }
            return { data, error }
        } catch (err: any) {
            console.error("Unexpected error during sign in:", err)
            toast.error("An unexpected error occurred")
            return { data: { user: null, session: null }, error: err }
        } finally {
            setLoading(false)
        }
    }

    const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
        setLoading(true)
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        })
        // Note: For signup, usually email verification is needed, so minimal state update
        if (error) {
            setLoading(false)
            toast.error(error.message)
        } else {
            toast.success("Account created! Please check your email.")
        }
        return { data, error }
    }

    const signInWithGoogle = async () => {
        setLoading(true)
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account'
                }
            }
        })
        if (error) {
            setLoading(false)
            toast.error(error.message)
        }
        return { data, error }
    }

    const signInWithAzure = async () => {
        setLoading(true)
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                scopes: 'email openid profile offline_access',
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    prompt: 'login' // Forces re-authentication to allow account selection
                }
            }
        })
        if (error) {
            setLoading(false)
            toast.error(error.message)
        }
        return { data, error }
    }

    async function signOut() {
        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error("Error signing out:", error)
        } finally {
            setUser(null)
            setProfile(null)
            setSession(null)
            setProfileLoaded(true) // Reset to loaded so we don't block UI waiting for nothing
            // Removed router.refresh() to avoid double reload effect before redirect
        }
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
