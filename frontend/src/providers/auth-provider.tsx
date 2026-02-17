'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js'
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
    profileLoaded: boolean
    isAdmin: boolean
    signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; profile?: Profile | null }>
    signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
    signInWithGoogle: () => Promise<{ error: AuthError | null }>
    signInWithAzure: () => Promise<{ error: AuthError | null }>
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const supabase = getSupabaseClient()

// --- Robust Auth Utilities ---

// Error Types
type AuthErrorType = 'NETWORK_TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_SESSION' | 'INVALID_TOKEN' | 'SERVER_ERROR' | 'UNKNOWN_ERROR';

class AppAuthError extends Error {
    type: AuthErrorType;
    originalError?: any;

    constructor(type: AuthErrorType, message: string, originalError?: any) {
        super(message);
        this.type = type;
        this.originalError = originalError;
        this.name = 'AppAuthError';
    }
}

// Helper to categorize errors
function classifyError(error: any): AppAuthError {
    const message = error?.message?.toLowerCase() || '';

    // Explicit session issues
    if (message.includes('session missing') ||
        message.includes('refresh_token_not_found') ||
        message.includes('invalid_grant')) {
        return new AppAuthError('INVALID_SESSION', 'Session invalid or expired', error);
    }

    // Network issues
    if (message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('offline') ||
        error?.status === 0 || // standard fetch network error status
        (typeof navigator !== 'undefined' && !navigator.onLine)) {
        return new AppAuthError('NETWORK_ERROR', 'Network connection issue', error);
    }

    if (error?.status >= 500) {
        return new AppAuthError('SERVER_ERROR', 'Server error occurred', error);
    }

    return new AppAuthError('UNKNOWN_ERROR', error?.message || 'Unknown authentication error', error);
}

// Exponential Backoff Retry Utility
async function authenticateWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Check online status first if possible
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                throw new Error('Offline');
            }

            // Exponential timeout: 5s, 10s, 20s... max 30s
            const timeoutDuration = Math.min(5000 * Math.pow(2, attempt), 30000);

            // Create a timeout promise
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Operation timed out')), timeoutDuration)
            );

            // Race the operation against the timeout
            return await Promise.race([operation(), timeoutPromise]);

        } catch (error: any) {
            const classifiedError = classifyError(error);
            const isLastAttempt = attempt === maxRetries - 1;

            // Log the retry attempt
            console.warn(`[Auth] Attempt ${attempt + 1} failed: ${classifiedError.type} - ${classifiedError.message}`);

            // If it's a critical auth failure, don't retry, fail immediately
            if (classifiedError.type === 'INVALID_SESSION' || classifiedError.type === 'INVALID_TOKEN') {
                throw classifiedError;
            }

            // If it's a network/timeout error and we have retries left, wait and retry
            if ((classifiedError.type === 'NETWORK_ERROR' || classifiedError.type === 'NETWORK_TIMEOUT' || classifiedError.type === 'SERVER_ERROR')
                && !isLastAttempt) {
                const backoffDelay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s...
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue;
            }

            // If no retries left or unknown error, throw
            throw classifiedError;
        }
    }
    throw new AppAuthError('UNKNOWN_ERROR', 'Max retries exceeded');
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileLoaded, setProfileLoaded] = useState(false)

    // Track last verification time for resume handling
    const lastVerificationTime = useRef<number>(Date.now());
    const loginInProgressRef = useRef(false)
    const mountedRef = useRef(true);

    // Fetch profile with better error handling (doesn't throw, returns null on error)
    async function fetchProfile(userId: string): Promise<Profile | null> {
        console.log('[Auth] fetchProfile started for user:', userId)
        try {
            // We use key 'id' to find the profile
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, avatar_url, role')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('[Auth] Error fetching profile:', error)
                return null
            }
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

    // Core verification logic
    const verifySession = useCallback(async (isInitialLoad = false) => {
        if (!mountedRef.current) return;

        console.log(`[Auth] verifySession (initial=${isInitialLoad}) starting...`);
        lastVerificationTime.current = Date.now();

        try {
            // 1. First, check strictly local session (fastest)
            // This allows offline usage if the token hasn't expired
            const { data: { session: localSession }, error: localError } = await supabase.auth.getSession();

            if (localError) throw localError;

            // If we have a local session, optimistically set it to unblock UI
            if (localSession && isInitialLoad && mountedRef.current) {
                console.log('[Auth] Optimistic local session found');
                setSession(localSession);
                setUser(localSession.user);
                // We don't set loading=false here yet, we wait for profile or validation
            }

            // 2. Perform robust server-side verification using getUser() with retry
            // This ensures the token is actually still valid on the server (revocation check)
            const { data: { user: verifiedUser }, error: verifyError } = await authenticateWithRetry(async () => {
                return await supabase.auth.getUser();
            });

            if (verifyError) throw verifyError;

            if (!mountedRef.current) return;

            // 3. User is valid and verified
            setUser(verifiedUser);

            // 4. Fetch Profile
            if (verifiedUser) {
                try {
                    // We don't need strict retry blocking for profile, can be best-effort
                    // or simple retry
                    const profileData = await fetchProfile(verifiedUser.id);
                    if (mountedRef.current) {
                        setProfile(profileData);
                    }
                } catch (pError) {
                    console.error('[Auth] Profile fetch failed (non-critical):', pError);
                    // Don't logout on profile fail, just show basic user
                }
            }

        } catch (error: any) {
            if (!mountedRef.current) return;

            const classified = classifyError(error);
            console.warn('[Auth] Verification failed:', classified);

            if (classified.type === 'INVALID_SESSION' || classified.type === 'INVALID_TOKEN') {
                // Critical auth error -> Must logout
                console.log('[Auth] Critical auth error, clearing session.');
                setSession(null);
                setUser(null);
                setProfile(null);
                // Clean up any stale data
                await supabase.auth.signOut().catch(() => { });
                if (!isInitialLoad) toast.error("Session expired. Please log in again.");
            } else if (classified.type === 'NETWORK_ERROR' || classified.type === 'NETWORK_TIMEOUT') {
                // Transient error -> Graceful degradation
                console.log('[Auth] Network error during verification. Keeping existing state if validation failed.');
                // If we are offline and have a local session (optimistically set above), 
                // we KEEP it and allow the user to proceed (Offline Mode)
                if (isInitialLoad && !session) {
                    // Initial load failed network check.
                    // If we successfully grabbed a local session earlier, we are technically "logged in offline"
                    // If supabase.auth.getSession() returned null, we are logged out.
                }
                if (!isInitialLoad) {
                    toast.warning("Network connection unstable. Some features may be offline.");
                }
            } else {
                // Unknown error
                console.error('[Auth] Unexpected error:', error);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setProfileLoaded(true);
            }
        }
    }, [session]);

    // Initial Load & Listeners
    useEffect(() => {
        mountedRef.current = true;

        // Initial verify
        verifySession(true);

        // Visibility Change Handler (for App Resume)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                // Only re-verify if > 10 minutes passed since last check
                // optimization to avoid spamming calls on quick tab switches
                if (now - lastVerificationTime.current > 10 * 60 * 1000) {
                    console.log('[Auth] App resumed after delay, re-verifying session...');
                    verifySession(false);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Supabase Auth State Change Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, newSession: Session | null) => {
                if (!mountedRef.current) return;

                // Skip if manual login is driving state
                if (loginInProgressRef.current) return;

                console.log(`[Auth] onAuthStateChange: ${event}`);

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    setSession(newSession);
                    setUser(newSession?.user ?? null);
                    // Trigger profile fetch if user changed
                    if (newSession?.user) {
                        // Debounce/check if profile already matches to avoid redundant fetches?
                        // For now simple is better:
                        refreshProfile();
                    }
                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                }

                setLoading(false);
                setProfileLoaded(true);
            }
        );

        return () => {
            mountedRef.current = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            subscription.unsubscribe();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ok, verifySession is stable

    const signInWithEmail = async (email: string, password: string): Promise<{ error: AuthError | null; profile?: Profile | null }> => {
        loginInProgressRef.current = true;

        try {
            // Using existing client method - retry logic could be added here if essential, 
            // but usually user can just click "Login" again for explicit actions.
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                toast.error(error.message);
                return { error };
            }

            if (data.session) {
                setSession(data.session);
                setUser(data.session.user);

                const profileData = await fetchProfile(data.session.user.id);
                setProfile(profileData);

                toast.success("Signed in successfully");
                return { error: null, profile: profileData };
            }

            return { error: null };
        } catch (err: any) {
            console.error("Sign in error:", err);
            toast.error("An unexpected error occurred during sign in");
            return { error: err };
        } finally {
            loginInProgressRef.current = false;
            setLoading(false);
            setProfileLoaded(true);
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
                    prompt: 'login'
                }
            }
        })
        if (error) {
            setLoading(false)
            toast.error(error.message)
        }
        return { data, error }
    }

    const signOut = useCallback(async () => {
        console.log('[Auth] signOut called');

        // Optimistic clear
        setUser(null)
        setProfile(null)
        setSession(null)
        setProfileLoaded(true)

        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error('[Auth] Error during signOut:', error)
        } finally {
            // Force clean local storage just to be safe
            if (typeof window !== 'undefined') {
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
