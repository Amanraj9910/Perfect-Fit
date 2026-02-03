'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { createClient, getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Briefcase,
    PlusCircle,
    Loader2,
    LogOut,
    Users,
    FileText,
    Trash2
} from 'lucide-react'

interface JobRole {
    id: string
    title: string
    department: string
    description: string
    requirements: string
    created_at: string
    created_by: string
}

const supabase = getSupabaseClient()

export default function EmployeePortal() {
    const router = useRouter()
    const { user, profile, loading: authLoading, profileLoaded, signOut } = useAuth()
    const [jobRoles, setJobRoles] = useState<JobRole[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [department, setDepartment] = useState('')
    const [description, setDescription] = useState('')
    const [requirements, setRequirements] = useState('')

    const fetchJobRoles = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('job_roles')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching job roles:', error)
        } else {
            setJobRoles(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        if (!authLoading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (profile?.role !== 'employee') {
                router.push('/auth/redirect')
            } else {
                fetchJobRoles()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, profile, authLoading, profileLoaded])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const { error } = await supabase
            .from('job_roles')
            .insert({
                title,
                department,
                description,
                requirements,
                created_by: user?.id
            })

        if (error) {
            console.error('Error creating job role:', error)
            alert('Failed to create job role. Please try again.')
        } else {
            setTitle('')
            setDepartment('')
            setDescription('')
            setRequirements('')
            setShowForm(false)
            fetchJobRoles()
        }
        setSaving(false)
    }

    const deleteJobRole = async (id: string) => {
        if (!confirm('Are you sure you want to delete this job role?')) return

        const { error } = await supabase
            .from('job_roles')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting job role:', error)
            alert('Failed to delete job role.')
        } else {
            setJobRoles(jobRoles.filter(j => j.id !== id))
        }
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth')
    }

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <header className="bg-background border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-bold">Employee Portal</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium">{profile?.full_name || 'Employee'}</p>
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
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Job Roles</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{jobRoles.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Departments</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Set(jobRoles.map(j => j.department)).size}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold capitalize">{profile?.role}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Job Roles Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Job Roles for Hiring</CardTitle>
                                <CardDescription>
                                    Create and manage job roles that need to be filled.
                                </CardDescription>
                            </div>
                            <Button onClick={() => setShowForm(!showForm)}>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Job Role
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Add Job Role Form */}
                        {showForm && (
                            <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg bg-muted/20">
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Job Title</Label>
                                            <Input
                                                id="title"
                                                placeholder="e.g. Senior Software Engineer"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="department">Department</Label>
                                            <Input
                                                id="department"
                                                placeholder="e.g. Engineering"
                                                value={department}
                                                onChange={(e) => setDepartment(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Describe the role and responsibilities..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="requirements">Requirements</Label>
                                        <Textarea
                                            id="requirements"
                                            placeholder="List the required skills and qualifications..."
                                            value={requirements}
                                            onChange={(e) => setRequirements(e.target.value)}
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={saving}>
                                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            Create Job Role
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Job Roles List */}
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : jobRoles.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">
                                No job roles created yet. Click "Add Job Role" to create one.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {jobRoles.map((job) => (
                                    <div key={job.id} className="p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-lg">{job.title}</h3>
                                                <p className="text-sm text-muted-foreground">{job.department}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => deleteJobRole(job.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="mt-2 text-sm">{job.description}</p>
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
                                            <p className="text-sm">{job.requirements}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
