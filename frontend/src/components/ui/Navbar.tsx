"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, User, LogOut, Menu, Briefcase } from "lucide-react";

export function Navbar() {
    const { user, profile, signOut, loading, profileLoaded } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.replace("/auth");
    };

    const isActive = (path: string) => pathname === path;

    // More maintainable portal detection
    const portalPrefixes = ["/admin", "/hr", "/employee"];
    const isPortalPage = portalPrefixes.some((p) =>
        pathname?.startsWith(p)
    );

    if (isPortalPage) {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6">

                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2 font-bold text-xl text-primary transition-colors hover:text-primary/90"
                >
                    <Target className="h-6 w-6" />
                    <span>Perfect Fit</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">

                    {/* Public Links */}
                    {(!user || profile?.role === "candidate") && (
                        <Link
                            href="/jobs"
                            className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/jobs")
                                ? "text-primary"
                                : "text-muted-foreground"
                                }`}
                        >
                            Job Openings
                        </Link>
                    )}

                    {/* Loading State */}
                    {loading || (user && !profileLoaded) ? (
                        <div className="flex items-center gap-4">
                            <div className="h-4 w-20 animate-pulse bg-muted rounded-md" />
                            <div className="h-9 w-9 animate-pulse bg-muted rounded-full" />
                        </div>
                    ) : user ? (
                        <div className="flex items-center gap-4 animate-in fade-in duration-300">

                            {/* Candidate / Employee Dashboard */}
                            {["candidate", "employee"].includes(
                                profile?.role || ""
                            ) && (
                                    <Link
                                        href="/dashboard"
                                        className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/dashboard")
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                            }`}
                                    >
                                        Dashboard
                                    </Link>
                                )}

                            {/* Admin / HR */}
                            {["admin", "hr", "recruiter"].includes(
                                profile?.role || ""
                            ) && (
                                    <Link
                                        href="/admin"
                                        className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/admin")
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                            }`}
                                    >
                                        Admin Portal
                                    </Link>
                                )}

                            {/* User Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="relative h-9 w-9 rounded-full ring-offset-background"
                                    >
                                        <Avatar className="h-9 w-9 border border-input">
                                            <AvatarImage
                                                src={profile?.avatar_url || ""}
                                                alt={
                                                    profile?.full_name || "User"
                                                }
                                            />
                                            <AvatarFallback>
                                                {profile?.full_name
                                                    ? profile.full_name[0].toUpperCase()
                                                    : <User className="h-4 w-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    className="w-56"
                                    align="end"
                                    forceMount
                                >
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {profile?.full_name || "User"}
                                            </p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                {profile?.email || user?.email}
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem asChild>
                                        <Link
                                            href="/profile"
                                            className="cursor-pointer w-full flex items-center"
                                        >
                                            <User className="mr-2 h-4 w-4" />
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem asChild>
                                        <Link
                                            href="/dashboard"
                                            className="cursor-pointer w-full flex items-center"
                                        >
                                            <Briefcase className="mr-2 h-4 w-4" />
                                            My Applications
                                        </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                        onClick={handleSignOut}
                                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 w-full flex items-center"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/auth">
                                <Button variant="ghost" size="sm">
                                    Log In
                                </Button>
                            </Link>
                            <Link href="/auth?tab=signup">
                                <Button size="sm">Get Started</Button>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Mobile */}
                <div className="md:hidden flex items-center">
                    <Link href={user ? "/dashboard" : "/auth"}>
                        <Button size="icon" variant="ghost">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
}
