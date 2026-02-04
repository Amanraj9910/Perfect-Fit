"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronDown, ChevronUp, CheckCircle, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Job {
    id: string;
    title: string;
    department: string;
    description: string;
    requirements: string;
    created_at: string;
}

export default function JobsPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
    const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
    const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchJobs() {
            setLoading(true);
            try {
                // Fetch public jobs
                // Note: using direct URL for now, assume proxy or CORS handled
                const res = await fetch("http://localhost:8000/api/jobs/public");
                if (!res.ok) throw new Error("Failed to fetch jobs");
                const data = await res.json();
                setJobs(data);

                // If logged in, check which ones I applied to?
                if (user) {
                    // Optimization: Fetch my applications to mark applied status
                    try {
                        const token = (await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }) => data.session?.access_token);
                        const appsRes = await fetch("http://localhost:8000/api/applications/me", {
                            headers: {
                                "X-Supabase-Auth": (await token) || ""
                            }
                        });
                        if (appsRes.ok) {
                            const apps = await appsRes.json();
                            const appliedIds = new Set(apps.map((app: any) => app.job_id));
                            setAppliedJobs(appliedIds as Set<string>);
                        }
                    } catch (err) {
                        console.error("Error fetching applications", err);
                    }
                }

            } catch (error) {
                console.error("Error loading jobs:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchJobs();
    }, [user]);

    const toggleExpand = (id: string) => {
        setExpandedJobId(expandedJobId === id ? null : id);
    };

    const handleApply = async (jobId: string) => {
        if (!user) {
            router.push("/auth?redirectTo=/jobs");
            return;
        }

        // Confirm apply? Or just apply with profile?
        // User requirements: "click on apply so his application should be created"
        // We'll proceed with direct apply using profile data.

        setApplyingJobId(jobId);
        try {
            const token = await (await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }) => data.session?.access_token);

            const res = await fetch(`http://localhost:8000/api/applications/${jobId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Supabase-Auth": token || ""
                },
                body: JSON.stringify({
                    cover_letter: "Applied via Website", // simplified for now
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to apply");
            }

            setAppliedJobs(prev => new Set(prev).add(jobId));
            // Show success toast? 
            alert("Application submitted successfully!");

        } catch (error: any) {
            console.error("Apply error:", error);
            alert(`Application failed: ${error.message}`);
        } finally {
            setApplyingJobId(null);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container max-w-5xl py-12 px-4 space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold sm:text-4xl">Open Positions</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Find your perfect fit. Apply with your verified profile.
                </p>
            </div>

            <div className="grid gap-6">
                {jobs.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No open positions right now</h3>
                        <p className="text-muted-foreground">Check back later for new opportunities.</p>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <Card key={job.id} className={`transition-all ${expandedJobId === job.id ? 'ring-2 ring-primary/5 shadow-lg' : 'hover:shadow-md'}`}>
                            <CardHeader className="cursor-pointer" onClick={() => toggleExpand(job.id)}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl text-primary">{job.title}</CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <Badge variant="outline">{job.department}</Badge>
                                            <span className="text-xs text-muted-foreground">Posted {new Date(job.created_at).toLocaleDateString()}</span>
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="shrink-0">
                                        {expandedJobId === job.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </CardHeader>
                            {expandedJobId === job.id && (
                                <>
                                    <Separator />
                                    <CardContent className="pt-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Description</h3>
                                            <p className="whitespace-pre-wrap leading-relaxed">{job.description}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Requirements</h3>
                                            <p className="whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-muted/10 flex justify-end p-4">
                                        {appliedJobs.has(job.id) ? (
                                            <Button disabled variant="secondary" className="gap-2">
                                                <CheckCircle className="h-4 w-4" />
                                                Applied
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleApply(job.id)}
                                                disabled={!!applyingJobId}
                                                size="lg"
                                                className="w-full sm:w-auto"
                                            >
                                                {applyingJobId === job.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Apply Now"}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
