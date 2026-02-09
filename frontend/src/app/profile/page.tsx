"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/providers/auth-provider";
import { useCandidateProfile } from "@/lib/hooks/use-candidate";
import { candidateApi, storageApi } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase";
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
import { Loader2, Upload, FileText, User as UserIcon, CheckCircle } from "lucide-react";
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
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [loadingTimeout, setLoadingTimeout] = useState(false);

    // Track if form has been initialized to prevent reset during typing
    const formInitialized = useRef(false);

    // Use React Query for profile data
    const { data: profile, isLoading, refetch, error } = useCandidateProfile();

    // Fallback for stuck loading state
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => {
                setLoadingTimeout(true);
            }, 5000); // 5 second timeout
            return () => clearTimeout(timer);
        } else {
            setLoadingTimeout(false);
        }
    }, [isLoading]);

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

    // Sync form with profile data when loaded - ONLY ONCE
    useEffect(() => {
        if (profile && !formInitialized.current) {
            form.reset({
                full_name: profile.full_name || "",
                phone: profile.phone || "",
                linkedin_url: profile.linkedin_url || "",
                portfolio_url: profile.portfolio_url || "",
                bio: profile.bio || "",
                experience_years: profile.experience_years || 0,
            });
            formInitialized.current = true;
        }
    }, [profile]); // Removed 'form' from dependencies to prevent loops

    // Reset initialization flag when component unmounts or user changes
    useEffect(() => {
        return () => {
            formInitialized.current = false;
        };
    }, [user?.id]);

    async function onSubmit(data: ProfileFormValues) {
        if (!user) {
            console.error("User must be logged in to update profile");
            alert("You must be logged in to update your profile.");
            return;
        }

        setIsSaving(true);

        try {
            const supabase = getSupabaseClient();

            // Update candidate_profile
            const { error } = await supabase.from("candidate_profiles").upsert({
                id: user.id,
                ...data,
                updated_at: new Date().toISOString()
            });

            if (error) throw error;

            // Refresh auth profile if name changed
            await refreshProfile();

            // Refetch React Query data
            await refetch();

        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile. Please try again.");
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
            if (isResume) {
                // Validate file type
                const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                if (!validTypes.includes(file.type)) {
                    throw new Error('Please upload a PDF or Word document');
                }
                await candidateApi.uploadResume(file);
            } else {
                // Validate image type
                if (!file.type.startsWith('image/')) {
                    throw new Error('Please upload an image file');
                }
                await candidateApi.uploadPicture(file);
            }

            // Refetch profile to get new URLs
            await refetch();

            if (!isResume) {
                await refreshProfile(); // Update avatar in navbar
            }

        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            const errorMessage = error instanceof Error ? error.message : `Failed to upload ${type}. Please try again.`;
            alert(errorMessage);
        } finally {
            setUploading(false);
            // Reset file input
            event.target.value = '';
        }
    }

    async function handleResumeView(e: React.MouseEvent) {
        e.preventDefault();
        if (!profile?.resume_url) return;

        try {
            const url = await storageApi.signUrl(profile.resume_url, true);
            window.open(url, '_blank');
        } catch (err) {
            console.error("Failed to download resume", err);
            // Fallback to direct URL
            window.open(profile.resume_url, '_blank');
        }
    }

    if (isLoading && !loadingTimeout) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (loadingTimeout || error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Unable to Load Profile</CardTitle>
                        <CardDescription>
                            {error ? "There was an error loading your profile." : "Loading is taking longer than expected."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                                Error: {error instanceof Error ? error.message : "Unknown error"}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button onClick={() => window.location.reload()} variant="outline">
                                Refresh Page
                            </Button>
                            <Button onClick={() => refetch()}>
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>Please log in to view your profile.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-6xl py-12 px-4 sm:px-6 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Candidate Profile</h1>
                <p className="text-muted-foreground text-lg">Manage your personal information and application assets.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
                {/* Sidebar / Photo */}
                <Card className="md:col-span-1 shadow-md border-muted/60">
                    <CardHeader className="text-center pb-2">
                        <CardTitle>Profile Picture</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 py-6">
                        <Avatar className="h-40 w-40 ring-4 ring-background shadow-xl">
                            <AvatarImage src={profile?.profile_pic_url || ""} className="object-cover" />
                            <AvatarFallback className="text-5xl bg-primary/5">
                                {form.watch("full_name")?.[0]?.toUpperCase() || <UserIcon className="h-16 w-16 text-muted-foreground/50" />}
                            </AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Button
                                variant="outline"
                                className="w-full relative overflow-hidden group border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                                disabled={uploadingPic}
                                type="button"
                            >
                                {uploadingPic ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                                )}
                                {uploadingPic ? "Uploading..." : "Change Photo"}
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'picture')}
                                    disabled={uploadingPic}
                                />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Form */}
                <Card className="md:col-span-2 shadow-md border-muted/60">
                    <CardHeader>
                        <CardTitle className="text-xl">Personal Details</CardTitle>
                        <CardDescription>Update your contact information and professional summary.</CardDescription>
                    </CardHeader>
                    <Separator className="mb-6 opacity-50" />
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <div className="grid gap-6">
                                    <FormField
                                        control={form.control}
                                        name="full_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-foreground/80">Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} className="bg-muted/30 focus:bg-background transition-colors" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-foreground/80">Phone</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="+1 234 567 890" {...field} className="bg-muted/30 focus:bg-background transition-colors" />
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
                                                    <FormLabel className="text-foreground/80">Years of Experience</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="0" {...field} className="bg-muted/30 focus:bg-background transition-colors" />
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
                                                <FormLabel className="text-foreground/80">LinkedIn URL</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://linkedin.com/in/..." {...field} className="bg-muted/30 focus:bg-background transition-colors" />
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
                                                <FormLabel className="text-foreground/80">Bio / Summary</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Briefly describe your background, skills, and career goals..."
                                                        className="resize-none min-h-[120px] bg-muted/30 focus:bg-background transition-colors leading-relaxed"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-xs text-right">
                                                    {field.value?.length || 0} / 1000 characters
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">Resume / CV</h3>
                                            <p className="text-sm text-muted-foreground">Upload your latest resume (PDF, DOCX)</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 pl-12">
                                        <div className="flex-1 overflow-hidden">
                                            {profile?.resume_url ? (
                                                <button
                                                    type="button"
                                                    onClick={handleResumeView}
                                                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                                                >
                                                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                    View Current Resume
                                                </button>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">No resume uploaded yet</p>
                                            )}
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="relative group overflow-hidden"
                                            disabled={uploadingResume}
                                            type="button"
                                        >
                                            {uploadingResume ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Upload className="h-4 w-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                                            )}
                                            {uploadingResume ? "Uploading..." : profile?.resume_url ? "Replace" : "Upload"}
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => handleFileUpload(e, 'resume')}
                                                disabled={uploadingResume}
                                            />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-muted/50">
                                    <Button
                                        type="submit"
                                        disabled={isSaving || !form.formState.isDirty}
                                        size="lg"
                                        className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all"
                                    >
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isSaving ? "Saving..." : "Save Profile Changes"}
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