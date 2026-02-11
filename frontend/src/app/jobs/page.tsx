"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { usePublicJobs } from "@/lib/hooks/use-jobs";
import { useMyApplications } from "@/lib/hooks/use-candidate";
import { jobsApi } from "@/lib/api";
import { toast } from "sonner";

interface Job {
    id: string;
    title: string;
    department: string;
    description: string;
    requirements: string;
    created_at: string;
}

export default function JobsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
    const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

    // Use React Query hooks
    const { data: jobs = [], isLoading: jobsLoading } = usePublicJobs();
    const { data: applications = [] } = useMyApplications();

    // Derived state
    const appliedJobs = new Set(applications.map((app: import("@/lib/api").JobApplication) => app.job_id));

    const toggleExpand = (id: string) => {
        setExpandedJobId(expandedJobId === id ? null : id);
    };

    const handleApply = async (jobId: string) => {
        if (!user) {
            router.push("/auth?redirectTo=/jobs");
            return;
        }

        setApplyingJobId(jobId);
        try {
            // Use static import - already imported at top
            await jobsApi.apply(jobId, {
                cover_letter: "Applied via Website",
            });

            // Invalidate applications cache to reflect new application immediately
            await queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });

            toast.success("Application submitted successfully!");

        } catch (error: any) {
            console.error("Apply error:", error);
            // Error toast is already shown by the API layer, but we can add context
            if (error.message?.includes("Authentication required")) {
                toast.error("Please sign in again to continue");
                router.push("/auth?redirectTo=/jobs");
            } else if (!error.message?.includes("API Error")) {
                // Only show toast if API layer didn't already show one
                toast.error(`Application failed: ${error.message || "Unknown error"}`);
            }
        } finally {
            setApplyingJobId(null);
        }
    };

    if (jobsLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (

        <div className="container mx-auto max-w-7xl py-12 px-4 sm:px-6 space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 pb-2">
                    Open Positions
                </h1>
                <p className="text-muted-foreground text-xl leading-relaxed">
                    Discover your next career move. Join us and help shape the future of AI.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs.length === 0 ? (
                    <div className="col-span-full text-center py-24 bg-muted/30 rounded-2xl border-2 border-dashed border-muted">
                        <div className="bg-background rounded-full p-4 w-fit mx-auto shadow-sm mb-4">
                            <Briefcase className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No open positions</h3>
                        <p className="text-muted-foreground">Check back soon for new opportunities.</p>
                    </div>
                ) : (
                    jobs.map((job) => (
                        <Card
                            key={job.id}
                            className={`group flex flex-col transition-all duration-300 border-muted/60 hover:border-primary/20 bg-card/50 backdrop-blur-sm ${expandedJobId === job.id ? 'ring-2 ring-primary/10 shadow-xl scale-[1.02] z-10' : 'hover:shadow-lg hover:-translate-y-1'}`}
                        >
                            <CardHeader className="cursor-pointer pb-2" onClick={() => toggleExpand(job.id)}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-2">
                                        <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                                            {job.department}
                                        </Badge>
                                        <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                            {job.title}
                                        </CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
                                        {expandedJobId === job.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground font-medium pt-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                    Posted {new Date(job.created_at).toLocaleDateString()}
                                </div>
                            </CardHeader>

                            {expandedJobId === job.id ? (
                                <>
                                    <Separator className="my-2 bg-gradient-to-r from-transparent via-border to-transparent" />
                                    <CardContent className="space-y-4 pt-4 text-sm flex-grow">
                                        <div className="space-y-1.5">
                                            <h4 className="font-semibold text-foreground/90 flex items-center gap-2">
                                                <div className="h-1 w-1 bg-primary rounded-full" /> Description
                                            </h4>
                                            <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary/10">
                                                {job.description}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <h4 className="font-semibold text-foreground/90 flex items-center gap-2">
                                                <div className="h-1 w-1 bg-primary rounded-full" /> Requirements
                                            </h4>
                                            <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary/10">
                                                {job.requirements}
                                            </p>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-4 bg-muted/30 mt-auto border-t border-muted/50">
                                        {appliedJobs.has(job.id) ? (
                                            <Button disabled variant="secondary" className="w-full gap-2 font-medium bg-green-500/10 text-green-700 hover:bg-green-500/20">
                                                <CheckCircle className="h-4 w-4" />
                                                Application Status
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleApply(job.id)}
                                                disabled={!!applyingJobId}
                                                size="lg"
                                                className="w-full shadow-md hover:shadow-lg transition-all"
                                            >
                                                {applyingJobId === job.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Apply for Position"}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </>
                            ) : (
                                <CardContent className="pt-2 pb-6">
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                        {job.description}
                                    </p>
                                </CardContent>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
