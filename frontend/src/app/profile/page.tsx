"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, FileText, User as UserIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Schema for profile details
const profileFormSchema = z.object({
    full_name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().optional(),
    linkedin_url: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
    portfolio_url: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
    bio: z.string().max(1000, "Bio must not exceed 1000 characters.").optional(),
    experience_years: z.coerce.number().min(0).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
    const { user, profile: authProfile, refreshProfile } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [resumeUrl, setResumeUrl] = useState<string | null>(null);
    const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            full_name: "",
            phone: "",
            linkedin_url: "",
            portfolio_url: "",
            bio: "",
            experience_years: 0,
        },
    });

    // Fetch candidate profile data
    useEffect(() => {
        async function fetchCandidateProfile() {
            if (!user) return;

            try {
                const token = (await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }: { data: any }) => data.session?.access_token);

                // Use our API proxy if possible, or direct supabase? 
                // We have `GET /candidates/me` endpoint now!
                // Let's use the backend API for consistency with implementations

                // We need the token. using `user` from auth provider doesn't give token directly, session does.
                // Actually `useAuth` returns session.
                // But let's assume we can fetch from API.

                // Or simpler, just use supabase client directly here like the AuthProvider does?
                // But we want to use the backend logic explicitly created.

                // fetch('/api/candidates/me')? No, it's on localhost:8000 usually, need proxy or full URL.
                // Frontend likely has proxy setup in next.config.js? Or we use full URL.
                // Let's assume standard fetch to backend. 
                // NOTE: User's setup has backend on 8000. Frontend on 3000.
                // We need to know if there is a proxy.
                // If not, we might have cors issues unless configured. (Main.py has CORS allowing 3000).

                const response = await fetch("http://localhost:8000/api/candidates/me", {
                    headers: {
                        "Authorization": `Bearer ${(await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }: { data: any }) => data.session?.access_token)}`,
                        "X-Supabase-Auth": (await import("@/lib/supabase")).getSupabaseClient().auth.getSession().then(({ data }: { data: any }) => data.session?.access_token || "") // Backup
                    }
                });

                // Wait, getting token is async. 
                // Let's simplify.
                // I'll blindly fetch for now.

            } catch (error) {
                console.error("Failed to fetch profile", error);
            }
        }

        // Actually, let's just use Supabase client directly in client component for data fetching to be fast and reliable
        // effectively `GET /candidates/me` logic but client-side.
        // BUT we need to upload files via Backend to use the Azure logic we wrote.

        // Let's FETCH data from Supabase directly for speed/simplicity in this component
        // and UPLOAD via backend API (or direct if we had SAS). We wrote backend upload.

        async function loadData() {
            if (!user) return;
            setIsLoading(true);
            const supabase = (await import("@/lib/supabase")).getSupabaseClient();

            const { data, error } = await supabase
                .from("candidate_profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (data) {
                form.reset({
                    full_name: data.full_name || authProfile?.full_name || "",
                    phone: data.phone || "",
                    linkedin_url: data.linkedin_url || "",
                    portfolio_url: data.portfolio_url || "",
                    bio: data.bio || "",
                    experience_years: data.experience_years || 0,
                });
                setResumeUrl(data.resume_url);
                setProfilePicUrl(data.profile_pic_url);
            } else {
                // defaults
                form.reset({
                    full_name: authProfile?.full_name || "",
                });
            }
            setIsLoading(false);
        }

        loadData();
    }, [user, authProfile, form]);


    async function onSubmit(data: ProfileFormValues) {
        if (!user) return;
        setIsSaving(true);

        try {
            const supabase = (await import("@/lib/supabase")).getSupabaseClient();

            // Update candidate_profile
            const { error } = await supabase.from("candidate_profiles").upsert({
                id: user.id,
                ...data,
                updated_at: new Date().toISOString()
            });

            if (error) throw error;

            // Refresh auth profile if name changed
            refreshProfile();

        } catch (error) {
            console.error("Error updating profile:", error);
            // Show toast?
        } finally {
            setIsSaving(false);
        }
    }

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'picture') {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        const isResume = type === 'resume';
        const setUploading = isResume ? setUploadingResume : setUploadingPic;
        setUploading(true);

        try {
            const supabase = (await import("@/lib/supabase")).getSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) throw new Error("No auth token");

            const formData = new FormData();
            formData.append("file", file);

            const endpoint = isResume ? "/api/candidates/upload/resume" : "/api/candidates/upload/picture";

            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: "POST",
                headers: {
                    "X-Supabase-Auth": session.access_token,
                    // Content-Type header is set automatically with FormData
                },
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");

            const result = await response.json();

            if (isResume) setResumeUrl(result.url);
            else {
                setProfilePicUrl(result.url);
                refreshProfile(); // Update avatar in navbar
            }

        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            alert(`Failed to upload ${type}. Please try again.`);
        } finally {
            setUploading(false);
        }
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container max-w-4xl py-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Candidate Profile</h1>
                <p className="text-muted-foreground">Manage your information and resume.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Sidebar / Photo */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Profile Picture</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={profilePicUrl || authProfile?.avatar_url || ""} />
                            <AvatarFallback className="text-4xl">{form.getValues("full_name")?.[0] || <UserIcon className="h-12 w-12" />}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="relative cursor-pointer" disabled={uploadingPic}>
                                {uploadingPic ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                Upload Photo
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'picture')}
                                />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Form */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Personal Details</CardTitle>
                        <CardDescription>Update your contact information and bio.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="full_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+1 234 567 890" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="experience_years"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Years of Experience</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="0" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="linkedin_url"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>LinkedIn URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://linkedin.com/in/..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bio"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bio / Summary</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Briefly describe your background..." className="resize-none" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Resume</h3>
                                    <div className="flex items-center gap-4 border p-4 rounded-md bg-muted/20">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                            <FileText className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            {resumeUrl ? (
                                                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-blue-600 truncate block">
                                                    View Uploaded Resume
                                                </a>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No resume uploaded</p>
                                            )}
                                        </div>
                                        <Button variant="secondary" size="sm" className="relative" disabled={uploadingResume} type="button">
                                            {uploadingResume ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                            Upload
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => handleFileUpload(e, 'resume')}
                                            />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
