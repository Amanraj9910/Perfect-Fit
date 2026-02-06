'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { useEmployeeJobs, useCreateJob, useUpdateJob, useDeleteJob } from '@/lib/hooks/use-admin-queries'
import { JobRole } from '@/lib/api'
import { toast } from "sonner"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Briefcase,
    PlusCircle,
    Loader2,
    LogOut,
    Users,
    FileText,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    Edit2
} from 'lucide-react'

export default function EmployeePortal() {
    const router = useRouter()
    const { user, profile, loading: authLoading, profileLoaded, signOut } = useAuth()
    const [showForm, setShowForm] = useState(false)
    const [editingJob, setEditingJob] = useState<JobRole | null>(null)

    // Form state
    const [title, setTitle] = useState('')
    const [department, setDepartment] = useState('')
    const [description, setDescription] = useState('')
    const [requirements, setRequirements] = useState('')

    // Use React Query for data fetching and caching
    const { data: jobRoles = [], isLoading: loading, error } = useEmployeeJobs()
    const createJobMutation = useCreateJob()
    const updateJobMutation = useUpdateJob()
    const deleteJobMutation = useDeleteJob()

    const saving = createJobMutation.isPending || updateJobMutation.isPending

    useEffect(() => {
        if (!authLoading && profileLoaded) {
            if (!user) {
                router.push('/auth')
            } else if (profile?.role !== 'employee' && profile?.role !== 'admin') {
                router.push('/auth/redirect')
            }
        }
    }, [user, profile, authLoading, profileLoaded, router])

    const resetForm = () => {
        setTitle('')
        setDepartment('')
        setDescription('')
        setRequirements('')
        setEditingJob(null)
        setShowForm(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (title.length < 2) {
            toast.error("Title must be at least 2 characters")
            return
        }
        if (department.length < 2) {
            toast.error("Department must be at least 2 characters")
            return
        }
        if (description.length < 10) {
            toast.error("Description must be at least 10 characters")
            return
        }
        if (requirements.length < 10) {
            toast.error("Requirements must be at least 10 characters")
            return
        }

        try {
            if (editingJob) {
                // Update existing job
                await updateJobMutation.mutateAsync({
                    id: editingJob.id,
                    data: { title, department, description, requirements }
                })
                toast.success("Job updated successfully")
            } else {
                // Create new job
                await createJobMutation.mutateAsync({
                    title,
                    department,
                    description,
                    requirements
                })
                toast.success("Job created successfully")
            }
            resetForm()
        } catch (err) {
            console.error('Error saving job role:', err)
            // Error is already handled/toasted by api.ts mostly, but if we catch it here:
            toast.error(err instanceof Error ? err.message : 'Failed to save job role')
        }
    }

    const startEditing = (job: JobRole) => {
        setEditingJob(job)
        setTitle(job.title)
        setDepartment(job.department)
        setDescription(job.description)
        setRequirements(job.requirements)
        setShowForm(true)
    }

    const handleDeleteJob = async (id: string) => {
        if (!confirm('Are you sure you want to delete this job role?')) return

        try {
            await deleteJobMutation.mutateAsync(id)
            toast.success("Job deleted successfully")
        } catch (err) {
            console.error('Error deleting job role:', err)
            toast.error(err instanceof Error ? err.message : 'Failed to delete job role')
        }
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth')
    }

    const getStatusBadge = (job: JobRole) => {
        switch (job.status) {
            case 'approved':
                return (
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                    </Badge>
                )
            case 'rejected':
                return (
                    <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                    </Badge>
                )
            default:
                return (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                    </Badge>
                )
        }
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
                {/* Error Alert */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <p className="font-medium">Error</p>
                        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {jobRoles.filter((j: JobRole) => j.status === 'pending').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Approved</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {jobRoles.filter((j: JobRole) => j.status === 'approved').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Departments</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Set(jobRoles.map((j: JobRole) => j.department)).size}
                            </div>
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
                                    Create and manage job roles that need to be filled. New roles require HR/Admin approval.
                                </CardDescription>
                            </div>
                            <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Job Role
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Add/Edit Job Role Form */}
                        {showForm && (
                            <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg bg-muted/20">
                                <h3 className="font-semibold mb-4">
                                    {editingJob ? 'Edit Job Role' : 'Create New Job Role'}
                                </h3>
                                {editingJob?.status === 'approved' && (
                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                                        <strong>Note:</strong> Editing an approved job will reset its status to pending and require re-approval.
                                    </div>
                                )}
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
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={saving}>
                                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            {editingJob ? 'Update Job Role' : 'Create Job Role'}
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
                                {jobRoles.map((job: JobRole) => (
                                    <div key={job.id} className="p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-lg">{job.title}</h3>
                                                        {getStatusBadge(job)}
                                                        {!job.is_open && (
                                                            <Badge variant="outline" className="text-muted-foreground">
                                                                Closed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{job.department}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => startEditing(job)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleDeleteJob(job.id)}
                                                    disabled={deleteJobMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm">{job.description}</p>
                                        <div className="mt-2">
                                            <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
                                            <p className="text-sm">{job.requirements}</p>
                                        </div>
                                        {job.rejection_reason && (
                                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                                                <p className="text-sm text-red-700">{job.rejection_reason}</p>
                                            </div>
                                        )}
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
