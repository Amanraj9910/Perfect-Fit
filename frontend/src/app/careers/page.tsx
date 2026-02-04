'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { jobsApi, JobRole } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Briefcase,
    Search,
    MapPin,
    Clock,
    ChevronRight,
    Loader2,
    Building,
    Sparkles,
    ArrowLeft
} from 'lucide-react'

export default function CareersPage() {
    const [jobs, setJobs] = useState<JobRole[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)

    useEffect(() => {
        fetchJobs()
    }, [])

    const fetchJobs = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await jobsApi.listPublic()
            setJobs(data || [])
        } catch (err) {
            console.error('Error fetching jobs:', err)
            setError(err instanceof Error ? err.message : 'Failed to load job listings')
        } finally {
            setLoading(false)
        }
    }

    // Get unique departments
    const departments = Array.from(new Set(jobs.map(job => job.department)))

    // Filter jobs
    const filteredJobs = jobs.filter(job => {
        const matchesSearch =
            job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.department.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesDepartment = !selectedDepartment || job.department === selectedDepartment

        return matchesSearch && matchesDepartment
    })

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm">Back to Home</span>
                        </Link>
                        <Link href="/auth">
                            <Button>Sign In</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10" />
                <div className="container mx-auto px-4 relative">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Sparkles className="h-6 w-6 text-primary" />
                            <span className="text-sm font-medium text-primary">Join Our Team</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
                            Find Your Perfect Role
                        </h1>
                        <p className="text-lg text-muted-foreground mb-8">
                            Discover opportunities that match your skills and aspirations.
                            We're building something amazing and want you to be part of it.
                        </p>

                        {/* Search Bar */}
                        <div className="relative max-w-xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search jobs by title, description, or department..."
                                className="pl-12 py-6 text-lg rounded-full shadow-lg border-slate-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar - Filters */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    Departments
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button
                                    variant={selectedDepartment === null ? 'default' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setSelectedDepartment(null)}
                                >
                                    All Departments
                                    <Badge variant="secondary" className="ml-auto">
                                        {jobs.length}
                                    </Badge>
                                </Button>
                                {departments.map((dept) => (
                                    <Button
                                        key={dept}
                                        variant={selectedDepartment === dept ? 'default' : 'ghost'}
                                        className="w-full justify-start"
                                        onClick={() => setSelectedDepartment(dept)}
                                    >
                                        {dept}
                                        <Badge variant="secondary" className="ml-auto">
                                            {jobs.filter(j => j.department === dept).length}
                                        </Badge>
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Job Listings */}
                    <div className="flex-1">
                        {/* Results Count */}
                        <div className="mb-6">
                            <p className="text-muted-foreground">
                                {loading ? 'Loading...' : `${filteredJobs.length} position${filteredJobs.length !== 1 ? 's' : ''} available`}
                            </p>
                        </div>

                        {/* Error State */}
                        {error && (
                            <Card className="border-red-200 bg-red-50">
                                <CardContent className="py-8 text-center">
                                    <p className="text-red-600">{error}</p>
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={fetchJobs}
                                    >
                                        Try Again
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && !error && filteredJobs.length === 0 && (
                            <Card>
                                <CardContent className="py-16 text-center">
                                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                    <h3 className="text-lg font-medium mb-2">No positions found</h3>
                                    <p className="text-muted-foreground">
                                        {searchQuery || selectedDepartment
                                            ? 'Try adjusting your search or filter criteria'
                                            : 'Check back soon for new opportunities'}
                                    </p>
                                    {(searchQuery || selectedDepartment) && (
                                        <Button
                                            variant="outline"
                                            className="mt-4"
                                            onClick={() => {
                                                setSearchQuery('')
                                                setSelectedDepartment(null)
                                            }}
                                        >
                                            Clear Filters
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Job Cards */}
                        {!loading && !error && filteredJobs.length > 0 && (
                            <div className="space-y-4">
                                {filteredJobs.map((job) => (
                                    <Card
                                        key={job.id}
                                        className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-primary/30"
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                            <Briefcase className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                                                                {job.title}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Building className="h-3.5 w-3.5" />
                                                                    {job.department}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="h-3.5 w-3.5" />
                                                                    {new Date(job.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="mt-3 text-muted-foreground line-clamp-2">
                                                        {job.description}
                                                    </p>
                                                    <div className="mt-4">
                                                        <p className="text-sm text-muted-foreground mb-2">Requirements:</p>
                                                        <p className="text-sm line-clamp-2">{job.requirements}</p>
                                                    </div>
                                                </div>
                                                <div className="flex md:flex-col items-center gap-2 md:items-end">
                                                    <Link href={`/careers/${job.id}`}>
                                                        <Button className="group/btn">
                                                            View Details
                                                            <ChevronRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t bg-slate-50 mt-16">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Perfect Fit</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © 2024 Perfect Fit. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
