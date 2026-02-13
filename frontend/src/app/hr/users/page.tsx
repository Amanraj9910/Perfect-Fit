'use client'

import AdminUserList from '@/components/admin/AdminUserList'

export default function HRCandidatesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
                <p className="text-muted-foreground">View candidate profiles.</p>
            </div>
            <AdminUserList readonly={true} />
        </div>
    )
}
