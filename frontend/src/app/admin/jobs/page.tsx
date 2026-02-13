'use client'

import AdminJobApprovals from '@/components/admin/AdminJobApprovals'

export default function AdminJobsPage() {
    return (
        <div className="space-y-6">
            {/* Stats/Header logic might move here or stay in component */}
            <AdminJobApprovals />
        </div>
    )
}
