import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold mb-8">Perfect Fit</h1>
                <div className="flex gap-4">
                    <Link href="/login">
                        <Button>Login</Button>
                    </Link>
                    <Link href="/register">
                        <Button variant="outline">Register</Button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
