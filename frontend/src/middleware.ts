import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // Protected Routes Definition
    const path = request.nextUrl.pathname

    // 1. If NOT logged in, block access to protected portals
    if (!session) {
        if (path.startsWith('/admin') || path.startsWith('/hr') || path.startsWith('/employee') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
            return NextResponse.redirect(new URL('/auth', request.url))
        }
        return response
    }

    // 2. If logged in, enforce role-based boundaries
    if (session) {
        // We need to fetch the role. 
        // Note: In a high-traffic app, we might put role in user_metadata or huge cookie to avoid DB hit here.
        // For now, we query. 
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        const role = profile?.role || 'candidate'

        // Rule A: Admins/HR/Recruiters - RESTRICTED TO PORTAL
        // They should NOT see the public landing page or candidate dashboard
        if (['admin', 'hr', 'recruiter'].includes(role)) {
            // Allowed paths: /admin, /hr, /api, /auth
            // If they try to go to root /, /jobs, /dashboard -> Redirect to their portal
            if (path === '/' || path.startsWith('/dashboard') || path.startsWith('/jobs')) {
                const target = role === 'admin' ? '/admin' : '/hr'
                return NextResponse.redirect(new URL(target, request.url))
            }
        }

        // Rule B: Employees - RESTRICTED TO EMPLOYEE PORTAL
        if (role === 'employee') {
            // Allowed paths: /employee, /api, /auth
            // If they try to go to root /, /jobs, /dashboard -> Redirect to /employee
            if (path === '/' || path.startsWith('/dashboard') || path.startsWith('/jobs') || path.startsWith('/admin') || path.startsWith('/hr')) {
                return NextResponse.redirect(new URL('/employee', request.url))
            }
        }

        // Rule C: Candidates - RESTRICTED FROM PORTALS
        if (role === 'candidate') {
            if (path.startsWith('/admin') || path.startsWith('/hr') || path.startsWith('/employee')) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - auth/callback (auth callback)
         * - api (api routes) - Let API routes handle their own auth usually, or protect specific ones if needed.
         * Actually, we want to run middleware on most pages.
         */
        '/((?!_next/static|_next/image|favicon.ico|auth/callback|api).*)',
    ],
}
