'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react'
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
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; profile?: Profile | null }>
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

    // Ref to track if we're in the middle of a login - prevents onAuthStateChange interference
    const loginInProgressRef = useRef(false)

    async function fetchProfile(userId: string): Promise<Profile | null> {
        // NOTE: Caller must ensure profileLoaded is set appropriately
        console.log('[Auth] fetchProfile started for user:', userId)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, avatar_url, role')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('[Auth] Error fetching profile:', error)
                return null
            }
            console.log('[Auth] Profile fetched successfully:', data?.full_name)
            return data as Profile
        } catch (err: any) {
            console.error('[Auth] Exception in fetchProfile:', err)
            return null
        }
    }

    async function refreshProfile(): Promise<void> {
        if (user) {
            const profileData = await fetchProfile(user.id)
            setProfile(profileData)
        }
    }

    useEffect(() => {
        let isMounted = true;

        // Get initial session and user securely
        const initAuth = async () => {
            console.log('[Auth] initAuth starting...')

            // Timeout promise to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Auth initialization timed out')), 5000)
            )

            try {
                // Race between the actual auth logic and the timeout
                await Promise.race([
                    (async () => {
                        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                        if (sessionError) throw sessionError;

                        if (!isMounted) return;
                        setSession(session)

                        // Use getUser() to get the user object securely to avoid warning
                        const { data: { user }, error: userError } = await supabase.auth.getUser()
                        if (userError) throw userError;

                        if (!isMounted) return;
                        console.log('[Auth] initAuth got user:', user?.id)
                        setUser(user)

                        if (user) {
                            try {
                                const profileData = await fetchProfile(user.id)
                                if (!isMounted) return;
                                setProfile(profileData)
                                console.log('[Auth] initAuth profile set:', profileData?.full_name)
                            } catch (err: any) {
                                console.error('[Auth] Profile fetch failed in initAuth:', err)
                                // If profile fetch fails, we might still want to let them be "logged in" 
                                // but without a profile, OR force logout. 
                                // For now, we'll keep them logged in but log the error.
                            }
                        }
                    })(),
                    timeoutPromise
                ])
            } catch (e: any) {
                if (!isMounted) return;
                console.error('[Auth] Auth initialization failed or timed out:', e)

                // CRITICAL: If initialization fails (especially due to timeout), 
                // we must assume the state is invalid and clear everything.
                // This fixes the issue where old/bad cookies cause a hang.
                console.log('[Auth] Forcing sign out due to initialization failure')

                // Clear state immediately
                setSession(null)
                setUser(null)
                setProfile(null)

                // Force Supabase to clear its storage/cookies
                // We use catch() here to ensure we don't break the finally block if this throws
                await supabase.auth.signOut().catch((err: any) =>
                    console.warn('[Auth] Error clearing supabase session:', err)
                )

                toast.error("Session expired or invalid. Please log in again.")
            } finally {
                // CRITICAL: Always set both loading and profileLoaded in finally
                // This ensures UI is never stuck in loading state
                if (isMounted) {
                    setProfileLoaded(true)
                    setLoading(false)
                    console.log('[Auth] initAuth complete - loading=false, profileLoaded=true')
                }
            }
        }

        initAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, newSession: Session | null) => {
                // Skip if login is in progress - let signInWithEmail handle it
                if (loginInProgressRef.current) {
                    console.log('[Auth] Skipping onAuthStateChange during login')
                    return
                }

                if (!isMounted) return;

                console.log('[Auth] onAuthStateChange:', _event)

                try {
                    setSession(newSession)

                    if (newSession) {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!isMounted) return;
                        setUser(user)
                        if (user) {
                            try {
                                const profileData = await fetchProfile(user.id)
                                if (!isMounted) return;
                                setProfile(profileData)
                            } catch (err: any) {
                                console.error('[Auth] Profile fetch failed in auth change:', err)
                            }
                        } else {
                            if (!isMounted) return;
                            setProfile(null)
                        }
                    } else {
                        setUser(null)
                        setProfile(null)
                        setProfileLoaded(true)
                    }
                } catch (e: any) {
                    console.error('[Auth] Auth change handler failed:', e)
                } finally {
                    // Only update loading states if they haven't been set yet
                    // This prevents navbar flicker on subsequent auth events
                    if (isMounted) {
                        setProfileLoaded(true)
                        setLoading(false)
                    }
                }
            }
        )

        return () => {
            isMounted = false;
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const signInWithEmail = async (email: string, password: string): Promise<{ error: AuthError | null; profile?: Profile | null }> => {
        // NOTE: Don't set loading=true here — it causes navbar to show skeleton during login
        // The calling code already manages its own loading state
        loginInProgressRef.current = true // Prevent onAuthStateChange from interfering

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (data.session) {
                setSession(data.session)
                setUser(data.session.user)

                // Fetch profile and set it
                let fetchedProfile: Profile | null = null
                try {
                    fetchedProfile = await fetchProfile(data.session.user.id);
                    setProfile(fetchedProfile);
                } catch (profileError) {
                    console.error("Profile fetch failed during login:", profileError);
                }

                toast.success("Signed in successfully")
                return { error: null, profile: fetchedProfile }
            } else if (error) {
                toast.error(error.message)
                return { error }
            }
            return { error: null }
        } catch (err: any) {
            console.error("Unexpected error during sign in:", err)
            toast.error("An unexpected error occurred")
            return { error: err }
        } finally {
            // CRITICAL: Always ensure profileLoaded is true and loading is false
            setProfileLoaded(true)
            setLoading(false)
            // Small delay before re-enabling onAuthStateChange to prevent
            // the SIGNED_IN event from re-triggering a fetch cycle
            setTimeout(() => {
                loginInProgressRef.current = false
            }, 100)
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

    // Use useCallback to prevent stale closure issues
    const signOut = useCallback(async () => {
        console.log('[Auth] signOut called')

        // ALWAYS clear local state first, regardless of API success
        // This ensures UI updates even if session was already expired
        setUser(null)
        setProfile(null)
        setSession(null)
        setProfileLoaded(true)

        try {
            // Attempt Supabase sign out
            const { error } = await supabase.auth.signOut()
            if (error) {
                console.warn('[Auth] signOut API warning (may be already signed out):', error.message)
            }
        } catch (error) {
            console.error('[Auth] Error during signOut API call:', error)
        } finally {
            // CRITICAL: Manually clear Supabase tokens from localStorage
            // This prevents "resurrection" of the session if the API call fails or if the client
            // holds onto the token in storage despite the signOut call.
            if (typeof window !== 'undefined') {
                console.log('[Auth] Manually clearing localStorage items')
                const keysToRemove = []
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i)
                    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                        keysToRemove.push(key)
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key))
            }
        }
    }, [])

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
