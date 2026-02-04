'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl">Authentication Error</CardTitle>
                    <CardDescription>
                        Something went wrong during the authentication process.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                        This could be due to an expired link, a cancelled login, or a temporary issue with the authentication provider.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Button asChild className="w-full">
                            <Link href="/auth">Try Again</Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link href="/">Go to Homepage</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
