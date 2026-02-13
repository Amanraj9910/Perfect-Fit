'use client'

import { useState } from 'react'
import AdminAssessmentList from '@/components/admin/AdminAssessmentList'

export default function AdminAssessmentsPage() {
    const [activeTab, setActiveTab] = useState<'english' | 'technical'>('english')

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Assessments</h2>
                <p className="text-muted-foreground">Manage assessment questions and reviews.</p>
            </div>
            <AdminAssessmentList
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </div>
    )
}
