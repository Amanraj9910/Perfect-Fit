import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // This is handled in the response below
                    },
                    remove(name: string, options: CookieOptions) {
                        // This is handled in the response below
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
            // Fetch user's role from profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.session.user.id)
                .single()

            // Determine redirect based on role
            let redirectPath = '/profile' // Default for candidates

            if (profile?.role) {
                switch (profile.role) {
                    case 'admin':
                        redirectPath = '/admin'
                        break
                    case 'hr':
                    case 'recruiter':
                        redirectPath = '/hr'
                        break
                    case 'employee':
                        redirectPath = '/employee'
                        break
                    default:
                        redirectPath = '/profile'
                }
            }

            const response = NextResponse.redirect(`${origin}${redirectPath}`)

            // Set the session cookies
            response.cookies.set('sb-access-token', data.session.access_token, {
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            })
            response.cookies.set('sb-refresh-token', data.session.refresh_token, {
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            })

            return response
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/error`)
}
