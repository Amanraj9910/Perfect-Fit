"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { Loader2, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePublicJobs } from "@/lib/hooks/use-jobs";
import { useMyApplications } from "@/lib/hooks/use-candidate";
import { jobsApi } from "@/lib/api";
import { toast } from "sonner";
import { PublicJobCard } from "@/components/jobs/PublicJobCard";
import { JobFilters, JobFiltersState } from "@/components/jobs/JobFilters";

export default function JobsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
    const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

    // Filter State
    const [filters, setFilters] = useState<JobFiltersState>({
        search: "",
        department: "all",
        employmentType: "all",
        workMode: "all"
    });

    // Use React Query hooks
    const { data: jobs = [], isLoading: jobsLoading } = usePublicJobs();
    const { data: applications = [] } = useMyApplications();

    // Derived state
    const appliedJobs = useMemo(() => new Set(applications.map((app: any) => app.job_id)), [applications]);

    // Extract unique values for filters
    const departments = useMemo(() => Array.from(new Set(jobs.map((j: any) => j.department))).sort(), [jobs]);
    const employmentTypes = useMemo(() => Array.from(new Set(jobs.map((j: any) => j.employment_type).filter(Boolean))).sort(), [jobs]);
    const workModes = useMemo(() => Array.from(new Set(jobs.map((j: any) => j.work_mode).filter(Boolean))).sort(), [jobs]);

    // Filter jobs
    const filteredJobs = useMemo(() => {
        return jobs.filter((job: any) => {
            const matchesSearch = filters.search === "" ||
                job.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.location?.toLowerCase().includes(filters.search.toLowerCase()) ||
                job.job_skills?.some((s: any) => s.skill_name.toLowerCase().includes(filters.search.toLowerCase()));

            const matchesDep = filters.department === "all" || job.department === filters.department;
            const matchesType = filters.employmentType === "all" || job.employment_type === filters.employmentType;
            const matchesMode = filters.workMode === "all" || job.work_mode === filters.workMode;

            return matchesSearch && matchesDep && matchesType && matchesMode;
        });
    }, [jobs, filters]);


    const toggleExpand = (id: string) => {
        setExpandedJobId(expandedJobId === id ? null : id);
    };

    const handleApply = async (jobId: string) => {
        if (!user) {
            router.push(`/auth?redirectTo=/jobs`);
            return;
        }

        setApplyingJobId(jobId);
        try {
            await jobsApi.apply(jobId, {
                cover_letter: "Applied via Website",
            });

            // Invalidate applications cache to reflect new application immediately
            await queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });

            toast.success("Application submitted successfully!");

        } catch (error: any) {
            console.error("Apply error:", error);
            if (error.message?.includes("Authentication required")) {
                toast.error("Please sign in again to continue");
                router.push("/auth?redirectTo=/jobs");
            } else if (!error.message?.includes("API Error")) {
                toast.error(`Application failed: ${error.message || "Unknown error"}`);
            }
        } finally {
            setApplyingJobId(null);
        }
    };

    const clearFilters = () => {
        setFilters({
            search: "",
            department: "all",
            employmentType: "all",
            workMode: "all"
        });
    };

    if (jobsLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container mx-auto max-w-7xl py-12 px-4 sm:px-6 space-y-8">
            <div className="text-center space-y-4 max-w-3xl mx-auto mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 pb-2">
                    Open Positions
                </h1>
                <p className="text-muted-foreground text-xl leading-relaxed">
                    Discover your next career move. Join us and help shape the future of AI.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

                {/* Sidebar Filters - Sticky on Desktop */}
                <div className="lg:col-span-1">
                    <JobFilters
                        filters={filters}
                        setFilters={setFilters}
                        departments={departments as string[]}
                        employmentTypes={employmentTypes as string[]}
                        workModes={workModes as string[]}
                        onClear={clearFilters}
                    />
                </div>

                {/* Job List */}
                <div className="lg:col-span-3 space-y-6">
                    {filteredJobs.length === 0 ? (
                        <div className="bg-muted/30 rounded-2xl border-2 border-dashed border-muted p-12 text-center">
                            <div className="bg-background rounded-full p-4 w-fit mx-auto shadow-sm mb-4">
                                <Briefcase className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No matching jobs found</h3>
                            <p className="text-muted-foreground mb-6">Try adjusting your filters or check back later.</p>
                            <button onClick={clearFilters} className="text-primary hover:underline font-medium">
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        filteredJobs.map((job: any) => (
                            <PublicJobCard
                                key={job.id}
                                job={job}
                                expanded={expandedJobId === job.id}
                                onToggleExpand={() => toggleExpand(job.id)}
                                onApply={handleApply}
                                isApplying={applyingJobId === job.id}
                                hasApplied={appliedJobs.has(job.id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

