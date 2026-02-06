import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const cookieStore = new Map<string, { value: string, options: CookieOptions }>()

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set(name, { value, options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.set(name, { value: '', options: { ...options, maxAge: 0 } })
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

            // Determine redirect base URL
            // Determine redirect base URL
            let siteUrl = ''
            const host = request.headers.get('x-forwarded-host') || request.headers.get('host')

            if (host) {
                const protocol = request.headers.get('x-forwarded-proto') || 'https'
                siteUrl = `${protocol}://${host}`
            } else {
                siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
            }

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

            const response = NextResponse.redirect(`${siteUrl}${redirectPath}`)

            // Apply the cookies from the temporary store to the response
            cookieStore.forEach(({ value, options }, name) => {
                response.cookies.set(name, value, options)
            })

            return response
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/error`)
}
