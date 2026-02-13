'use client'

import AdminUserList from '@/components/admin/AdminUserList'

export default function AdminUsersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Users</h2>
                <p className="text-muted-foreground">Manage user accounts and roles.</p>
            </div>
            <AdminUserList />
        </div>
    )
}
