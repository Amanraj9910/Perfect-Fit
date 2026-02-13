'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    Users,
    FileText,
    Briefcase,
    LogOut,
    UserCircle
} from 'lucide-react'

export default function HRSidebar() {
    const pathname = usePathname()
    const { profile, signOut } = useAuth()

    const navItems = [
        {
            name: 'Dashboard',
            href: '/hr/dashboard',
            icon: LayoutDashboard
        },
        {
            name: 'Candidates',
            href: '/hr/users',
            icon: Users
        },
        {
            name: 'Assessments',
            href: '/hr/assessments',
            icon: FileText
        },
        {
            name: 'Jobs',
            href: '/hr/jobs',
            icon: Briefcase
        },
        {
            name: 'Applications',
            href: '/hr/applications',
            icon: FileText
        }
    ]

    return (
        <aside className="hidden md:flex flex-col w-64 border-r bg-background h-screen sticky top-0">
            <div className="p-6 border-b">
                <div className="flex items-center gap-2">
                    <div className="bg-purple-100 p-1.5 rounded-lg">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <span className="font-bold text-lg block leading-none">HR Portal</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                        >
                            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive
                                ? "bg-purple-50 text-purple-600"
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
                        <p className="text-sm font-medium truncate">{profile?.full_name || 'HR Specialist'}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-purple-600"
                    onClick={() => signOut()}
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </aside>
    )
}
