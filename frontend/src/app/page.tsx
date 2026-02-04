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
        <div className="flex min-h-screen flex-col bg-background overflow-x-hidden w-full max-w-[100vw]">
            {/* Header / Navbar */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Target className="h-6 w-6" />
                        <span>Perfect Fit</span>
                    </div>
                    {/* Hide nav buttons on very small screens or show icon */}
                    <nav className="flex gap-4">
                        <Link href="/auth">
                            <Button variant="ghost" className="hidden sm:inline-flex">Log In</Button>
                        </Link>
                        <Link href="/auth">
                            <Button size="sm" className="sm:size-default">Get Started</Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                {/* 1. Hero Section */}
                <section className="container py-12 sm:py-24 space-y-8 text-center md:text-left md:flex md:justify-between md:items-center px-4 sm:px-8 overflow-hidden">
                    <div className="md:w-1/2 space-y-6">
                        <Badge variant="secondary" className="px-4 py-1.5 text-sm font-normal">
                            Reinventing Technical Hiring
                        </Badge>
                        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                            Real Skills. <br className="hidden md:inline" />
                            <span className="text-primary block md:inline">Transparent Matches.</span>
                        </h1>
                        <p className="max-w-[700px] mx-auto md:mx-0 text-lg text-muted-foreground md:text-xl">
                            Evaluates real skills, gives feedback, and matches fairly.
                            No keyword filtering. No resume black holes.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <Link href="/profile" className="w-full sm:w-auto">
                                <Button size="lg" className="w-full h-12 text-base px-8">
                                    Start Your Skill Evaluation
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 text-base">
                                See How It Works
                            </Button>
                        </div>
                        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground justify-center md:justify-start">
                            <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Bias-Free</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Instant Feedback</span>
                            </div>
                        </div>
                    </div>
                    <div className="md:w-1/2 flex justify-center mt-12 md:mt-0 relative px-4">
                        {/* Abstract Illustration Placeholder */}
                        <div className="relative w-full max-w-[300px] sm:max-w-md aspect-square rounded-full bg-gradient-to-tr from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center animate-in fade-in zoom-in duration-1000">
                            <div className="absolute inset-0 rounded-full border border-primary/10 animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-8 rounded-full border border-primary/20 animate-[spin_15s_linear_infinite_reverse]" />
                            <Zap className="h-24 w-24 text-primary/20" />
                        </div>
                        {/* Floating Cards - Hidden on very small screens to prevent overflow */}
                        <Card className="absolute top-0 left-0 sm:top-10 sm:left-10 md:-left-4 w-40 sm:w-48 shadow-lg animate-in slide-in-from-bottom-5 duration-700 delay-200 hidden sm:block">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Skill Score</p>
                                    <p className="font-bold">Verified</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="absolute bottom-0 right-0 sm:bottom-10 sm:right-10 md:-right-4 w-40 sm:w-48 shadow-lg animate-in slide-in-from-bottom-5 duration-700 delay-500 hidden sm:block">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Match Fit</p>
                                    <p className="font-bold">98%</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <Separator />

                {/* 2. Problem Section */}
                <section className="container py-16 sm:py-24 bg-muted/30 px-4 sm:px-8">
                    <div className="text-center mb-12 space-y-4">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight md:text-4xl">The Hiring Broken Record</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">We fixed the frustration on both sides of the table.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                        {/* Job Seekers */}
                        <Card className="border-red-100 bg-red-50/10 dark:bg-card">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mb-4">
                                    <User className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">For Job Seekers</CardTitle>
                                <CardDescription>Why traditional applying feels hopeless</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3 text-muted-foreground">
                                    <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p>Ghosting after spending hours applying</p>
                                </div>
                                <div className="flex items-start gap-3 text-muted-foreground">
                                    <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p>Arbitrary rejection based on resume keywords</p>
                                </div>
                                <div className="flex items-start gap-3 text-muted-foreground">
                                    <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p>Zero feedback on why you weren't selected</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recruiters */}
                        <Card className="border-orange-100 bg-orange-50/10 dark:bg-card">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">For Recruiters</CardTitle>
                                <CardDescription>Why finding talent is exhausting</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3 text-muted-foreground">
                                    <XCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                    <p>Flooded with unqualified "spray and pray" applicants</p>
                                </div>
                                <div className="flex items-start gap-3 text-muted-foreground">
                                    <XCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                    <p>Resume exaggerations that waste interview time</p>
                                </div>
                                <div className="flex items-start gap-3 text-muted-foreground">
                                    <XCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                    <p>Manual screening that introduces unconscious bias</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 3. Solution Flow */}
                <section className="container py-16 sm:py-24 px-4 sm:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight md:text-4xl">How Perfect Fit Works</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <FileCheck className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold">1. Get Assessed</h3>
                            <p className="text-muted-foreground px-4">Prove your skills in technical tasks, communication, and problem-solving scenarios.</p>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <Search className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold">2. Receive Scorecard</h3>
                            <p className="text-muted-foreground px-4">Get a transparent, verified scorecard showing your strengths and areas for growth.</p>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <MessageSquare className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold">3. Match & Interview</h3>
                            <p className="text-muted-foreground px-4">Get matched with companies looking for exactly your skill profile. Skip the screening call.</p>
                        </div>
                    </div>

                    <div className="mt-16 sm:mt-24 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border flex flex-col items-center overflow-hidden">
                        <Badge className="mb-6">Sample Output</Badge>
                        <Card className="w-full max-w-sm shadow-xl">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">Candidate #8492</CardTitle>
                                        <CardDescription>Full Stack Engineer</CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="text-green-600 bg-green-100">96% Match</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>Technical Architecture</span>
                                        <span className="font-medium">9/10</span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[90%]" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>Communication</span>
                                        <span className="font-medium">8.5/10</span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[85%]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 4. Trust Section */}
                <section className="container py-16 sm:py-24 bg-secondary/20 px-4 sm:px-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: Shield, title: "Bias-Aware AI", desc: "Algorithms audited for fairness." },
                            { icon: CheckCircle, title: "No Keyword Filtering", desc: "Skills matter, not buzzwords." },
                            { icon: Users, title: "Human Reviewed", desc: "AI assists, humans decide." },
                            { icon: Zap, title: "Feedback Loop", desc: "Know why you were rejected." },
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <item.icon className="h-6 w-6 text-primary shrink-0" />
                                <div>
                                    <h4 className="font-bold">{item.title}</h4>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 5. Open Positions */}
                <section className="container py-16 sm:py-24 px-4 sm:px-8">
                    <div className="text-center mb-12 space-y-4">
                        <Badge variant="secondary" className="px-4 py-1.5 text-sm font-normal">
                            We're Hiring
                        </Badge>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight md:text-4xl">Open Positions</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Join our team and help shape the future of fair hiring.
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {/* This is a static preview - for dynamic content, convert to client component */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Briefcase className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">View All Open Positions</p>
                                        <p className="text-sm text-muted-foreground">Browse our full list of opportunities</p>
                                    </div>
                                </div>
                                <Link href="/careers">
                                    <Button>
                                        Explore Careers
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 6. Dual CTA */}
                <section className="container py-16 sm:py-24 px-4 sm:px-8">
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <Card className="bg-primary text-primary-foreground border-none">
                            <CardHeader>
                                <CardTitle className="text-2xl">Job Seeker?</CardTitle>
                                <CardDescription className="text-primary-foreground/80">Stop applying into the void.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Link href="/profile">
                                    <Button variant="secondary" size="lg" className="w-full font-bold">
                                        Build My Verified Profile
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl">Recruiter?</CardTitle>
                                <CardDescription>Stop screening unqualified resumes.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" size="lg" className="w-full font-bold">
                                    Hire Verified Talent
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </main>

            <footer className="border-t py-12 bg-muted/20">
                <div className="container px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
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
