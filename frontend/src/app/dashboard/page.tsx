"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle, Clock, XCircle, ExternalLink, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { type JobApplication } from "@/lib/api";

export default function CandidateDashboard() {
    const router = useRouter();
    const { user, profile, session, loading: authLoading } = useAuth();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If auth is still loading, do nothing yet
        if (authLoading) return;

        // If auth finished but no user, stop local loading (redirect usually handles this)
        if (!user) {
            setLoading(false);
            return;
        }

        async function fetchApplications() {
            setLoading(true);
            try {
                // Dynamically import api to avoid circular dependencies during SSR if any
                // though usually safe. Using direct import at top is better but let's stick to logic flow.
                // Better: rely on the api helper.
                const { applicationsApi } = await import("@/lib/api");

                const data = await applicationsApi.listMine();
                setApplications(data);
            } catch (error) {
                console.error("Error fetching applications", error);
                // toast.error("Failed to load applications"); // Optional
            } finally {
                setLoading(false);
            }
        }

        fetchApplications();
    }, [user, authLoading]);

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    // Assessment Link provided by user instructions
    const ASSESSMENT_LINK = "https://english-assisment-frontend-dneudafhasbchsfv.centralindia-01.azurewebsites.net";

    const handleStartAssessment = () => {
        if (session) {
            const params = new URLSearchParams({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                type: 'sso',
                redirect: '/dashboard'
            });
            const url = `${ASSESSMENT_LINK}/sso-callback?${params.toString()}`;
            window.open(url, '_blank');
        } else {
            window.open(`${ASSESSMENT_LINK}/login`, '_blank');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'submitted': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Submitted</Badge>;
            case 'reviewing': return <Badge variant="default" className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> In Review</Badge>;
            case 'shortlisted': return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Shortlisted</Badge>;
            case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Not Selected</Badge>;
            case 'hired': return <Badge variant="default" className="bg-purple-500"><CheckCircle className="w-3 h-3 mr-1" /> Hired</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="container mx-auto max-w-6xl py-12 px-4 sm:px-6 space-y-10">
            <div className="space-y-2">
                <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-2">
                    ← Back to Jobs
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Application Dashboard</h1>
                <p className="text-muted-foreground text-lg">Track the progress of your active applications.</p>
            </div>

            <div className="grid gap-6">
                {applications.length === 0 ? (
                    <Card className="text-center py-24 border-dashed border-2 shadow-sm bg-muted/20">
                        <CardContent className="flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 bg-background rounded-full shadow-sm">
                                <Briefcase className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-semibold">No applications yet</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    You haven't applied to any positions. Explore our openings to find your next role.
                                </p>
                            </div>
                            <Button asChild size="lg" className="mt-4 shadow-md hover:shadow-lg transition-all">
                                <Link href="/jobs">View Open Positions</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    applications.map(app => (
                        <Card key={app.id} className="group overflow-hidden border-muted/60 transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                            <CardHeader className="bg-muted/5 pb-4 border-b border-muted/50">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1">
                                            <span>Application ID: #{app.id.slice(0, 8)}</span>
                                            <span>•</span>
                                            <span>{new Date(app.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <CardTitle className="text-xl text-primary font-bold group-hover:text-primary/80 transition-colors">
                                            {app.job_title || "Job Application"}
                                        </CardTitle>
                                    </div>
                                    <div className="scale-100 transition-transform">
                                        {getStatusBadge(app.status)}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {/* Logic for different statuses */}
                                {app.status === 'shortlisted' ? (
                                    <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-200/60 dark:border-green-900 rounded-lg p-6 space-y-4 animate-in slide-in-from-top-1 duration-300">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 shrink-0">
                                                <CheckCircle className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-green-800 dark:text-green-300 text-lg">Congratulations! You've been shortlisted.</h4>
                                                <p className="text-muted-foreground">
                                                    Your profile stood out to us. The next step is a skills assessment to evaluate your fit for the role.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pl-[52px] flex flex-wrap gap-3">
                                            <Button
                                                size="lg"
                                                className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/10 hover:shadow-green-900/20 transition-all"
                                                onClick={handleStartAssessment}
                                            >
                                                Start Assessment <ExternalLink className="h-4 w-4" />
                                            </Button>

                                            {app.technical_assessment_completed && (
                                                <div className="w-full mt-2">
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 py-1.5 px-3">
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                                        Technical Assessment Completed
                                                    </Badge>
                                                </div>
                                            )}
                                            {!app.technical_assessment_completed && (
                                                <Button
                                                    size="lg"
                                                    variant="outline"
                                                    className="gap-2 border-green-600/30 hover:bg-green-50 text-green-700"
                                                    onClick={() => router.push(`/assessments/technical/${app.job_id}`)}
                                                >
                                                    Technical Assessment <ExternalLink className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : app.status === 'rejected' && app.feedback ? (
                                    <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-200/60 dark:border-red-900 rounded-lg p-6 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 shrink-0">
                                                <AlertCircle className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-red-800 dark:text-red-300 text-lg">Status Update</h4>
                                                <p className="text-muted-foreground">
                                                    Thank you for your interest. Unfortunately, we have decided not to move forward with your application at this time.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="pl-[52px] mt-2">
                                            <div className="bg-background rounded-md border p-4 text-sm text-muted-foreground shadow-sm">
                                                <span className="font-semibold text-foreground block mb-1 text-xs uppercase tracking-wider">Hiring Manager Feedback</span>
                                                "{app.feedback}"
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 py-2 text-muted-foreground">
                                        <div className="p-2 bg-muted rounded-full">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm">
                                            Your application is currently <span className="font-medium text-foreground">under review</span>. We will notify you here once there is an update.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div >
    );
}
