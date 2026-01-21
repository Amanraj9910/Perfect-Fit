import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Github, Linkedin, Mail, CheckCircle, Shield, Target } from "lucide-react";

export default function AuthPage() {
    return (
        <div className="w-full min-h-screen grid lg:grid-cols-2">
            {/* Left: Branding & Trust (Side Panel) */}
            <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 text-zinc-100">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <Target className="h-6 w-6" />
                    <span>Perfect Fit</span>
                </div>

                <div className="space-y-8 max-w-md">
                    <h2 className="text-4xl font-extrabold tracking-tight">
                        Hiring based on <span className="text-blue-400">skill</span>, not resume keywords.
                    </h2>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-zinc-800 p-2 rounded-lg">
                                <Shield className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">We don't sell resumes</h3>
                                <p className="text-zinc-400">Your data is private. Recruiters only see what you choose to share.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="mt-1 bg-zinc-800 p-2 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">No spam applications</h3>
                                <p className="text-zinc-400">Apply only when you're a high match. Save time, reduce anxiety.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-sm text-zinc-500">
                    &copy; {new Date().getFullYear()} Perfect Fit Inc.
                </div>
            </div>

            {/* Right: Auth Forms */}
            <div className="flex items-center justify-center p-8 bg-background">
                <Card className="w-full max-w-md border-none shadow-none lg:border lg:shadow-sm">
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                        <CardDescription>Enter your email to sign in to your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="m@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        <Link href="#" className="text-xs text-primary underline-offset-4 hover:underline">
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Input id="password" type="password" />
                                </div>
                                <Button className="w-full">Sign In</Button>
                            </TabsContent>

                            <TabsContent value="signup" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="first-name">First name</Label>
                                        <Input id="first-name" placeholder="Max" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last-name">Last name</Label>
                                        <Input id="last-name" placeholder="Robinson" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <Input id="signup-email" type="email" placeholder="m@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <Input id="signup-password" type="password" />
                                </div>
                                <Button className="w-full">Create Account</Button>
                            </TabsContent>

                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Button variant="outline" className="w-full">
                                    <Github className="mr-2 h-4 w-4" />
                                    GitHub
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <Linkedin className="mr-2 h-4 w-4 text-blue-600" />
                                    LinkedIn
                                </Button>
                            </div>
                        </Tabs>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <p className="text-xs text-center text-muted-foreground w-3/4">
                            By clicking continue, you agree to our <Link href="#" className="underline hover:text-primary">Terms of Service</Link> and <Link href="#" className="underline hover:text-primary">Privacy Policy</Link>.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
