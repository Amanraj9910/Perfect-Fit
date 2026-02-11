'use client'

import { useEffect, useState, useCallback } from 'react'
import { applicationsApi, JobApplication, storageApi } from '@/lib/api'
import { useAdminApplications, useUpdateApplicationStatus } from '@/lib/hooks/use-admin-queries'
import { XCircle, FileText, ExternalLink, Loader2 } from 'lucide-react'

export default function ApplicationList() {
    const { data: applications = [], isLoading: loading, error: queryError } = useAdminApplications()
    const error = queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null

    // const [applications, setApplications] = useState<JobApplication[]>([]) // Removed in favor of hook
    // const [loading, setLoading] = useState(true) // Removed in favor of hook
    // const [error, setError] = useState<string | null>(null) // Removed in favor of hook

    const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null)
    const [feedback, setFeedback] = useState('')

    const updateStatusMutation = useUpdateApplicationStatus()
    const actionLoading = updateStatusMutation.isPending

    const handleStatusUpdate = (id: string, status: JobApplication['status']) => {
        updateStatusMutation.mutate({ id, status, feedback }, {
            onSuccess: () => {
                setSelectedApp(null)
                setFeedback('')
            },
            onError: (err) => {
                console.error("Failed to update status", err)
                alert("Failed to update status")
            }
        })
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    if (error) return <div className="text-red-500 p-8">{error}</div>

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Job Applications</h2>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied At</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {applications.map((app) => (
                            <tr key={app.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{app.candidate_name || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">{app.candidate_email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{app.job_title}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${app.status === 'shortlisted' ? 'bg-green-100 text-green-800' :
                                            app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'}`}>
                                        {app.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {app.created_at && !Number.isNaN(Date.parse(app.created_at))
                                        ? new Date(app.created_at).toLocaleDateString()
                                        : "Unknown"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => setSelectedApp(app)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Application Detail Modal (Simple implementation) */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold">{selectedApp.candidate_name} - {selectedApp.job_title}</h3>
                            <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">
                                <XCircle />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm text-gray-500 uppercase">Cover Letter</h4>
                                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{selectedApp.cover_letter || 'No cover letter provided.'}</p>
                            </div>

                            <div className="flex gap-4">
                                {selectedApp.resume_url && (
                                    <button
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            try {
                                                // Use static import - already imported at top
                                                const url = await storageApi.signUrl(selectedApp.resume_url!, true);
                                                window.open(url, '_blank');
                                            } catch (err) {
                                                console.error("Failed to download resume", err);
                                                window.open(selectedApp.resume_url, '_blank');
                                            }
                                        }}
                                        className="flex items-center text-blue-600 hover:underline focus:outline-none"
                                    >
                                        <FileText className="w-4 h-4 mr-1" /> View Resume
                                    </button>
                                )}
                                {selectedApp.linkedin_url && (
                                    <a href={selectedApp.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                                        <ExternalLink className="w-4 h-4 mr-1" /> LinkedIn
                                    </a>
                                )}
                            </div>

                            <hr />

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Review Action</label>
                                {selectedApp.status === 'submitted' || selectedApp.status === 'reviewing' ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder="Reason for rejection or approval notes (optional)"
                                            className="w-full border rounded p-2"
                                            rows={3}
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleStatusUpdate(selectedApp.id, 'shortlisted')}
                                                disabled={actionLoading}
                                                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 flex justify-center items-center"
                                            >
                                                {actionLoading ? <Loader2 className="animate-spin" /> : 'Approve for Assessment'}
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                                                disabled={actionLoading}
                                                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50 flex justify-center items-center"
                                            >
                                                {actionLoading ? <Loader2 className="animate-spin" /> : 'Reject'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-3 rounded text-center text-gray-600">
                                        Application is currently <strong>{selectedApp.status}</strong>.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
