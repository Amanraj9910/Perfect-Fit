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
import { Loader2, AlertCircle, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Application {
    id: string;
    job_id: string;
    job_title: string;
    status: 'submitted' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';
    feedback?: string; // added this manually in migration
    created_at: string;
}

export default function CandidateDashboard() {
    const { user, profile } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchApplications() {
            if (!user) return;
            setLoading(true);
            try {
                const token = await (await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }: { data: any }) => data.session?.access_token);
                const res = await fetch("http://localhost:8000/api/applications/me", {
                    headers: {
                        "X-Supabase-Auth": token || ""
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    setApplications(data);
                }
            } catch (error) {
                console.error("Error fetching applications", error);
            } finally {
                setLoading(false);
            }
        }

        fetchApplications();
    }, [user]);

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    // Assessment Link provided by user instructions
    const ASSESSMENT_LINK = "https://english-assisment-frontend-dneudafhasbchsfv.centralindia-01.azurewebsites.net";

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
        <div className="container max-w-5xl py-12 px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">My Applications</h1>
                <p className="text-muted-foreground">Track the status of your job applications.</p>
            </div>

            <div className="grid gap-6">
                {applications.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <p className="text-muted-foreground mb-4">You haven't applied to any jobs yet.</p>
                            <Link href="/jobs">
                                <Button>Browse Open Positions</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    applications.map(app => (
                        <Card key={app.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl text-primary">{app.job_title || "Job Application"}</CardTitle>
                                        <CardDescription>Applied on {new Date(app.created_at).toLocaleDateString()}</CardDescription>
                                    </div>
                                    {getStatusBadge(app.status)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Logic for different statuses */}
                                {app.status === 'shortlisted' && (
                                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 p-4 rounded-md space-y-3">
                                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                                            <CheckCircle className="h-5 w-5" />
                                            Congratulations! You've been shortlisted.
                                        </div>
                                        <p className="text-sm">
                                            The next step is to complete our skill assessment. Please click the link below to proceed.
                                        </p>
                                        <Button asChild className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                            <a href={ASSESSMENT_LINK} target="_blank" rel="noopener noreferrer">
                                                Take Assessment <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                )}

                                {app.status === 'rejected' && app.feedback && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 p-4 rounded-md space-y-2">
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold">
                                            <AlertCircle className="h-5 w-5" />
                                            Update on your application
                                        </div>
                                        <p className="text-sm">We appreciate your interest, but we cannot move forward with your application at this time.</p>
                                        <div className="mt-2">
                                            <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Feedback</span>
                                            <p className="text-sm mt-1 p-2 bg-white dark:bg-slate-950 rounded border">{app.feedback}</p>
                                        </div>
                                    </div>
                                )}

                                {(app.status === 'submitted' || app.status === 'reviewing') && (
                                    <p className="text-sm text-muted-foreground">Your application is currently being reviewed by our team. We will update you here once a decision is made.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
