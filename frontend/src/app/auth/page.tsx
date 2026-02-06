'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Shield, Target, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

// Google icon component
const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

// Microsoft/Azure icon component
const MicrosoftIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
);

export default function AuthPage() {
    const router = useRouter();
    const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithAzure, user, profile, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Signup state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Starting login process...');
        setLoading(true);
        setError(null);
        setIsLoggingIn(true);

        const { error } = await signInWithEmail(loginEmail, loginPassword);

        if (error) {
            console.error('Login error:', error.message);
            setError(error.message);
            setLoading(false);
            setIsLoggingIn(false);
        } else {
            console.log('Login successful (provider response), waiting for user state update...');
        }
        // If success, useEffect will handle redirect once user state updates
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const fullName = `${firstName} ${lastName}`.trim();
        const { error } = await signUpWithEmail(signupEmail, signupPassword, fullName);

        if (error) {
            setError(error.message);
        } else {
            setSuccess('Account created! Please check your email to verify your account.');
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error.message);
            setLoading(false);
        }
        // Redirect happens automatically via OAuth
    };

    const handleAzureLogin = async () => {
        setLoading(true);
        setError(null);
        const { error } = await signInWithAzure();
        if (error) {
            setError(error.message);
            setLoading(false);
        }
        // Redirect happens automatically via OAuth
    };

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
                        <CardDescription>Sign in to your account or create a new one</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                                {success}
                            </div>
                        )}

                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="space-y-4">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="m@example.com"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password">Password</Label>
                                            <Link href="#" className="text-xs text-primary underline-offset-4 hover:underline">
                                                Forgot password?
                                            </Link>
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={loginPassword}
                                            onChange={(e) => setLoginPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button className="w-full" type="submit" disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Sign In
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup" className="space-y-4">
                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="first-name">First name</Label>
                                            <Input
                                                id="first-name"
                                                placeholder="Max"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last-name">Last name</Label>
                                            <Input
                                                id="last-name"
                                                placeholder="Robinson"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email</Label>
                                        <Input
                                            id="signup-email"
                                            type="email"
                                            placeholder="m@example.com"
                                            value={signupEmail}
                                            onChange={(e) => setSignupEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Password</Label>
                                        <Input
                                            id="signup-password"
                                            type="password"
                                            value={signupPassword}
                                            onChange={(e) => setSignupPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <Button className="w-full" type="submit" disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Create Account
                                    </Button>
                                </form>
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
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                >
                                    <GoogleIcon />
                                    Google
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleAzureLogin}
                                    disabled={loading}
                                >
                                    <MicrosoftIcon />
                                    Microsoft
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
