'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { createClient, getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Users,
    UserCheck,
    Briefcase,
    ClipboardList,
    Loader2,
    LogOut,
    RefreshCw,
    Eye
} from 'lucide-react'

type UserRole = 'candidate' | 'employee' | 'hr' | 'recruiter' | 'admin'

interface Profile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    role: UserRole
    created_at: string
}

interface JobRole {
    id: string
    title: string
    department: string
    description: string
    requirements: string
    created_at: string
}

const ROLE_COLORS: Record<UserRole, string> = {
    candidate: 'bg-gray-100 text-gray-800',
    employee: 'bg-blue-100 text-blue-800',
    hr: 'bg-purple-100 text-purple-800',
    recruiter: 'bg-green-100 text-green-800',
    admin: 'bg-red-100 text-red-800'
}

const supabase = getSupabaseClient()

export default function HRPanel() {
    const router = useRouter()
    const { user, profile, loading: authLoading, profileLoaded, signOut } = useAuth()
    const [candidates, setCandidates] = useState<Profile[]>([])
    const [employees, setEmployees] = useState<Profile[]>([])
    const [jobRoles, setJobRoles] = useState<JobRole[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)

        // Fetch users
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (usersError) {
            console.error('Error fetching users:', usersError)
        } else {
            setCandidates((users || []).filter((u: Profile) => u.role === 'candidate'))
            setEmployees((users || []).filter((u: Profile) => u.role === 'employee'))
        }

        // Fetch job roles
        const { data: roles, error: rolesError } = await supabase
            .from('job_roles')
            .select('*')
            .order('created_at', { ascending: false })

        if (rolesError) {
            console.error('Error fetching job roles:', rolesError)
        } else {
            setJobRoles(roles || [])
        }

        setLoading(false)
    }

    useEffect(() => {
        if (!authLoading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (profile?.role !== 'hr' && profile?.role !== 'recruiter') {
                router.push('/auth/redirect')
            } else {
                fetchData()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, profile, authLoading, profileLoaded])

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth')
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const CandidateRow = ({ candidate }: { candidate: Profile }) => (
        <div className="flex items-center justify-between py-4 border-b last:border-0">
            <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage src={candidate.avatar_url || undefined} />
                    <AvatarFallback>
                        {candidate.full_name?.charAt(0) || candidate.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium">{candidate.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{candidate.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[candidate.role]}`}>
                    {candidate.role}
                </span>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                </Button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <header className="bg-background border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-bold">HR Panel</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium">{profile?.full_name || 'HR'}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        </div>
                        <Button variant="outline" size="icon" onClick={handleSignOut}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{candidates.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Employees</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{employees.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{jobRoles.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold capitalize">{profile?.role}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>HR Dashboard</CardTitle>
                                <CardDescription>
                                    View candidates, employees, and open positions.
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchData}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="candidates">
                            <TabsList className="mb-4">
                                <TabsTrigger value="candidates">Candidates ({candidates.length})</TabsTrigger>
                                <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
                                <TabsTrigger value="positions">Open Positions ({jobRoles.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="candidates">
                                {candidates.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No candidates found</p>
                                ) : (
                                    candidates.map(c => <CandidateRow key={c.id} candidate={c} />)
                                )}
                            </TabsContent>

                            <TabsContent value="employees">
                                {employees.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No employees found</p>
                                ) : (
                                    employees.map(e => <CandidateRow key={e.id} candidate={e} />)
                                )}
                            </TabsContent>

                            <TabsContent value="positions">
                                {jobRoles.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No open positions found</p>
                                ) : (
                                    <div className="space-y-4">
                                        {jobRoles.map((job) => (
                                            <div key={job.id} className="p-4 border rounded-lg">
                                                <h3 className="font-semibold text-lg">{job.title}</h3>
                                                <p className="text-sm text-muted-foreground">{job.department}</p>
                                                <p className="mt-2 text-sm">{job.description}</p>
                                                <div className="mt-2">
                                                    <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
                                                    <p className="text-sm">{job.requirements}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
