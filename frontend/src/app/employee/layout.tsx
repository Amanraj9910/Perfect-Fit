
'use client'

import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
    Briefcase,
    LayoutDashboard,
    LogOut,
    PlusCircle,
    UserCircle
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function EmployeeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, profile, loading, signOut } = useAuth()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth')
        }
    }, [user, loading, router])

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>
    }

    const navItems = [
        {
            name: 'Dashboard',
            href: '/employee/dashboard',
            icon: LayoutDashboard // Ensure you have this icon or similar
        },
        {
            name: 'My Jobs',
            href: '/employee/jobs',
            icon: Briefcase
        },
        {
            name: 'Create Job',
            href: '/employee/jobs/create',
            icon: PlusCircle
        }
    ]

    return (
        <div className="flex min-h-screen bg-muted/10">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-64 border-r bg-background">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-primary" />
                        <span className="font-bold text-lg">Perfect Fit</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                            >
                                <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted"
                                    }`}>
                                    <Icon className="h-4 w-4" />
                                    {item.name}
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t mt-auto">
                    <div className="flex items-center gap-3 px-3 mb-4">
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{profile?.full_name || 'Employee'}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-destructive"
                        onClick={() => signOut()}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
