'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { createClient, getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Users,
    UserCheck,
    Briefcase,
    Shield,
    Loader2,
    LogOut,
    RefreshCw
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

const ROLE_LABELS: Record<UserRole, string> = {
    candidate: 'Candidate',
    employee: 'Employee',
    hr: 'HR',
    recruiter: 'Recruiter',
    admin: 'Admin'
}

const ROLE_COLORS: Record<UserRole, string> = {
    candidate: 'bg-gray-100 text-gray-800',
    employee: 'bg-blue-100 text-blue-800',
    hr: 'bg-purple-100 text-purple-800',
    recruiter: 'bg-green-100 text-green-800',
    admin: 'bg-red-100 text-red-800'
}

const supabase = getSupabaseClient()

export default function AdminPage() {
    const router = useRouter()
    const { user, profile, loading: authLoading, profileLoaded, signOut, isAdmin } = useAuth()
    const [users, setUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState<string | null>(null)

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching users:', error)
        } else {
            setUsers(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        if (!authLoading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (!isAdmin) {
                router.push('/auth/redirect')
            } else {
                fetchUsers()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isAdmin, authLoading, profileLoaded])

    const updateUserRole = async (userId: string, newRole: UserRole) => {
        setUpdating(userId)

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)

        if (error) {
            console.error('Error updating role:', error)
            alert('Failed to update role. Make sure you have admin permissions.')
        } else {
            setUsers(users.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ))
        }
        setUpdating(null)
    }

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

    const candidates = users.filter(u => u.role === 'candidate')
    const employees = users.filter(u => u.role === 'employee' || u.role === 'hr')
    const recruiters = users.filter(u => u.role === 'recruiter')
    const admins = users.filter(u => u.role === 'admin')

    const UserRow = ({ user: u }: { user: Profile }) => (
        <div className="flex items-center justify-between py-4 border-b last:border-0">
            <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback>
                        {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-medium">{u.full_name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                </span>
                <Select
                    value={u.role}
                    onValueChange={(value) => updateUserRole(u.id, value as UserRole)}
                    disabled={updating === u.id || u.id === profile?.id}
                >
                    <SelectTrigger className="w-36">
                        {updating === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <SelectValue />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="candidate">Candidate</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <header className="bg-background border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-bold">Admin Portal</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium">{profile?.full_name || 'Admin'}</p>
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
                            <CardTitle className="text-sm font-medium">Recruiters</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{recruiters.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Admins</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{admins.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* User Management Tabs */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>
                                    View and manage user roles. All users start as candidates and can be promoted.
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchUsers}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="all">
                            <TabsList className="mb-4">
                                <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
                                <TabsTrigger value="candidates">Candidates ({candidates.length})</TabsTrigger>
                                <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
                                <TabsTrigger value="staff">Recruiters & Admins ({recruiters.length + admins.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all">
                                {users.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No users found</p>
                                ) : (
                                    users.map(u => <UserRow key={u.id} user={u} />)
                                )}
                            </TabsContent>

                            <TabsContent value="candidates">
                                {candidates.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No candidates found</p>
                                ) : (
                                    candidates.map(u => <UserRow key={u.id} user={u} />)
                                )}
                            </TabsContent>

                            <TabsContent value="employees">
                                {employees.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No employees found</p>
                                ) : (
                                    employees.map(u => <UserRow key={u.id} user={u} />)
                                )}
                            </TabsContent>

                            <TabsContent value="staff">
                                {(recruiters.length + admins.length) === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No staff found</p>
                                ) : (
                                    [...recruiters, ...admins].map(u => <UserRow key={u.id} user={u} />)
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
