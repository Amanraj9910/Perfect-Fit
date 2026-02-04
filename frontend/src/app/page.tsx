import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    CheckCircle,
    XCircle,
    Shield,
    Target,
    Zap,
    ArrowRight,
    User,
    Briefcase,
    Search,
    FileCheck,
    MessageSquare,
    Users
} from "lucide-react";

export default function Home() {
    return (
        <div className="flex min-h-screen flex-col bg-background overflow-x-hidden">
            {/* Header / Navbar */}


            <main className="flex-1 w-full relative overflow-hidden">
                {/* 1. Hero Section */}
                <section className="container mx-auto max-w-7xl py-12 sm:py-24 space-y-8 text-center md:text-left md:flex md:justify-between md:items-center px-4 sm:px-6 relative z-10">
                    <div className="md:w-1/2 space-y-6">
                        <Badge variant="secondary" className="px-4 py-1.5 text-sm font-normal">
                            Reinventing Technical Hiring
                        </Badge>
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                            Real Skills. <br className="hidden md:inline" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Transparent Matches.</span>
                        </h1>
                        <p className="max-w-[700px] mx-auto md:mx-0 text-lg text-muted-foreground md:text-xl">
                            Evaluates real skills, gives feedback, and matches fairly. <br className="hidden sm:inline" />
                            No keyword filtering. No resume black holes.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-2">
                            <Link href="/profile" className="w-full sm:w-auto">
                                <Button size="lg" className="w-full h-12 text-base px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                                    Start Your Skill Evaluation
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 text-base">
                                See How It Works
                            </Button>
                        </div>
                        <div className="pt-6 flex flex-col sm:flex-row items-center gap-6 text-sm text-foreground/70 font-medium justify-center md:justify-start">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span>Bias-Free</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span>Instant Feedback</span>
                            </div>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center mt-12 md:mt-0 relative px-4">
                        {/* Abstract Illustration Placeholder */}
                        <div className="relative w-full max-w-[400px] aspect-square rounded-full bg-gradient-to-tr from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 flex items-center justify-center animate-in fade-in zoom-in duration-1000">
                            <div className="absolute inset-0 rounded-full border border-primary/5 animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-12 rounded-full border border-primary/10 animate-[spin_15s_linear_infinite_reverse]" />
                            <div className="absolute inset-24 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite]" />
                            <Zap className="h-24 w-24 text-primary/20" />
                        </div>
                        {/* Floating Cards */}
                        <Card className="absolute top-[10%] left-0 sm:left-10 w-44 shadow-xl border-t-4 border-t-green-500 animate-in slide-in-from-bottom-5 duration-700 delay-200 hidden sm:block bg-background/80 backdrop-blur-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Skill Score</p>
                                    <p className="font-bold text-lg">Verified</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="absolute bottom-[20%] right-0 sm:right-10 w-44 shadow-xl border-t-4 border-t-blue-500 animate-in slide-in-from-bottom-5 duration-700 delay-500 hidden sm:block bg-background/80 backdrop-blur-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Match Fit</p>
                                    <p className="font-bold text-lg">98%</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Separator className="opacity-50" />

                {/* 2. Problem Section */}
                <section className="bg-muted/30 py-16 sm:py-24">
                    <div className="container mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">The Hiring Broken Record</h2>
                            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">We fixed the frustration on both sides of the table.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
                            {/* Job Seekers */}
                            <Card className="border-red-100 bg-gradient-to-b from-red-50/20 to-transparent dark:from-red-900/10 dark:border-red-900/50 h-full relative overflow-hidden group hover:border-red-200 transition-colors">
                                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50" />
                                <CardHeader>
                                    <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 text-2xl shadow-sm">
                                        <User className="h-7 w-7" />
                                    </div>
                                    <CardTitle className="text-2xl">For Job Seekers</CardTitle>
                                    <CardDescription className="text-base">Why traditional applying feels hopeless</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="flex items-start gap-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                                        <p className="text-lg">Ghosting after spending hours applying</p>
                                    </div>
                                    <div className="flex items-start gap-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                                        <p className="text-lg">Arbitrary rejection based on resume keywords</p>
                                    </div>
                                    <div className="flex items-start gap-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                                        <p className="text-lg">Zero feedback on why you weren't selected</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recruiters */}
                            <Card className="border-orange-100 bg-gradient-to-b from-orange-50/20 to-transparent dark:from-orange-900/10 dark:border-orange-900/50 h-full relative overflow-hidden group hover:border-orange-200 transition-colors">
                                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-50" />
                                <CardHeader>
                                    <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 text-2xl shadow-sm">
                                        <Briefcase className="h-7 w-7" />
                                    </div>
                                    <CardTitle className="text-2xl">For Recruiters</CardTitle>
                                    <CardDescription className="text-base">Why finding talent is exhausting</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="flex items-start gap-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <XCircle className="h-6 w-6 text-orange-500 shrink-0" />
                                        <p className="text-lg">Flooded with unqualified "spray and pray" applicants</p>
                                    </div>
                                    <div className="flex items-start gap-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <XCircle className="h-6 w-6 text-orange-500 shrink-0" />
                                        <p className="text-lg">Resume exaggerations that waste interview time</p>
                                    </div>
                                    <div className="flex items-start gap-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                        <XCircle className="h-6 w-6 text-orange-500 shrink-0" />
                                        <p className="text-lg">Manual screening that introduces unconscious bias</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 3. Solution Flow */}
                <section className="py-16 sm:py-24">
                    <div className="container mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tight md:text-5xl mb-4">How Perfect Fit Works</h2>
                            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">A transparent process that respects your time and skills.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 relative">
                            {/* Connecting Line (Hidden on mobile) */}
                            <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent border-t border-dashed" />

                            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                                <div className="w-20 h-20 rounded-2xl bg-background border shadow-lg flex items-center justify-center group hover:scale-110 transition-transform duration-300">
                                    <FileCheck className="h-10 w-10 text-primary group-hover:text-primary/80 transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold">1. Get Assessed</h3>
                                    <p className="text-muted-foreground px-4 leading-relaxed">Prove your skills in realistic scenarios. No whiteboards, no tricks.</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                                <div className="w-20 h-20 rounded-2xl bg-background border shadow-lg flex items-center justify-center group hover:scale-110 transition-transform duration-300">
                                    <Search className="h-10 w-10 text-primary group-hover:text-primary/80 transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold">2. Get Verified</h3>
                                    <p className="text-muted-foreground px-4 leading-relaxed">Receive a comprehensive scorecard highlighting your true strengths.</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                                <div className="w-20 h-20 rounded-2xl bg-background border shadow-lg flex items-center justify-center group hover:scale-110 transition-transform duration-300">
                                    <MessageSquare className="h-10 w-10 text-primary group-hover:text-primary/80 transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold">3. Get Hired</h3>
                                    <p className="text-muted-foreground px-4 leading-relaxed">Direct matches with top companies. Skip the screening queue.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border flex flex-col items-center overflow-hidden">
                            <Badge className="mb-8 px-4 py-1">Sample Match Result</Badge>
                            <Card className="w-full max-w-sm shadow-2xl border-primary/20">
                                <CardHeader className="pb-4 border-b">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-lg">Candidate #8492</CardTitle>
                                            <CardDescription>Senior Full Stack Engineer</CardDescription>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-2xl font-bold text-green-600">96%</span>
                                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Match Fit</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Technical Architecture</span>
                                            <span>9/10</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-[90%] rounded-full" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>System Design</span>
                                            <span>8.5/10</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-[85%] rounded-full" />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Button size="sm" className="w-full">View Full Profile</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 4. Trust Section */}
                <section className="bg-secondary/30 py-16 sm:py-24 border-y border-border/50">
                    <div className="container mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { icon: Shield, title: "Bias-Aware AI", desc: "Algorithms audited for fairness." },
                                { icon: CheckCircle, title: "No Keyword Filtering", desc: "Skills matter, not buzzwords." },
                                { icon: Users, title: "Human Reviewed", desc: "AI assists, humans decide." },
                                { icon: Zap, title: "Feedback Loop", desc: "Know why you were rejected." },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 items-start p-4 hover:bg-background/50 rounded-xl transition-colors">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                        <item.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 5. Open Positions */}
                <section className="container mx-auto max-w-7xl py-16 sm:py-24 px-4 sm:px-6">
                    <div className="bg-primary/5 rounded-3xl p-8 sm:p-16 text-center space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                            <Briefcase className="h-48 w-48 text-primary rotate-12" />
                        </div>

                        <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                            <Badge variant="secondary" className="px-4 py-1.5 text-sm font-normal uppercase tracking-wider bg-background text-foreground">
                                We're Hiring
                            </Badge>
                            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Ready to find your match?</h2>
                            <p className="text-muted-foreground text-xl">
                                Browse our open positions or create your verified profile to let opportunities find you.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                <Link href="/jobs">
                                    <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto">
                                        Browse Open Positions
                                    </Button>
                                </Link>
                                <Link href="/profile">
                                    <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-background w-full sm:w-auto">
                                        Create Profile
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. Dual CTA */}
                <section className="container mx-auto max-w-7xl py-16 sm:py-24 px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <Card className="bg-primary text-primary-foreground border-none shadow-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader>
                                <CardTitle className="text-3xl">Job Seeker?</CardTitle>
                                <CardDescription className="text-primary-foreground/80 text-lg">Stop applying into the void. Get verified and get hired.</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-8">
                                <Link href="/profile">
                                    <Button variant="secondary" size="lg" className="w-full font-bold h-12 text-base shadow-lg cursor-pointer">
                                        Build My Verified Profile
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xl relative overflow-hidden group border-muted hover:border-primary/20 transition-colors">
                            <div className="absolute inset-0 bg-secondary/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader>
                                <CardTitle className="text-3xl">Recruiter?</CardTitle>
                                <CardDescription className="text-lg">Stop screening unqualified resumes. Hire pre-vetted talent.</CardDescription>
                            </CardHeader>
                            <CardContent className="mt-8">
                                <Button variant="outline" size="lg" className="w-full font-bold h-12 text-base border-2 hover:bg-background">
                                    Hire Verified Talent
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>

            <footer className="border-t py-12 bg-muted/20">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-lg text-primary">
                        <Target className="h-5 w-5" />
                        <span>Perfect Fit</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-center md:text-left">
                        &copy; {new Date().getFullYear()} Perfect Fit. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <Link href="#" className="hover:underline">Privacy</Link>
                        <Link href="#" className="hover:underline">Terms</Link>
                        <Link href="#" className="hover:underline">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
