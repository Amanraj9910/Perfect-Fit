'use client'

import { useAdminStats } from '@/lib/hooks/use-admin-queries'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default function AdminDashboardPage() {
    const { data: stats, isLoading } = useAdminStats()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Overview of system statistics and activity.</p>
            </div>
            <AdminDashboard stats={stats} loading={isLoading} />
        </div>
    )
}
