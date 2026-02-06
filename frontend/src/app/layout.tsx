import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { Navbar } from "@/components/ui/Navbar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Perfect Fit Candidate Portal",
    description: "Find your perfect job match with AI",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <QueryProvider>
                    <AuthProvider>
                        <Navbar />
                        {children}
                        <Toaster />
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
