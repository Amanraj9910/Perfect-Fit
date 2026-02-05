/**
 * Supabase Realtime Subscriptions
 * 
 * Provides real-time updates for job_roles, approval_requests, and job_applications tables.
 * When data changes in the database, React Query cache is automatically invalidated.
 */

import { getSupabaseClient } from './supabase'
import { QueryClient } from '@tanstack/react-query'
import { RealtimeChannel } from '@supabase/supabase-js'

// Store active subscriptions for cleanup
let jobRolesChannel: RealtimeChannel | null = null
let applicationsChannel: RealtimeChannel | null = null

// Toast callback type for notifications
type ToastCallback = (message: string) => void

/**
 * Subscribe to real-time changes on job_roles table
 * Automatically invalidates React Query cache when data changes
 */
export function subscribeToJobRoles(
    queryClient: QueryClient,
    onToast?: ToastCallback
): () => void {
    const supabase = getSupabaseClient()

    // Clean up existing subscription if any
    if (jobRolesChannel) {
        supabase.removeChannel(jobRolesChannel)
    }

    jobRolesChannel = supabase
        .channel('job_roles_changes')
        .on(
            'postgres_changes',
            {
                event: '*',  // Listen to INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'job_roles'
            },
            (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
                console.log('[Realtime] job_roles change:', payload.eventType)

                // Invalidate all job-related queries
                queryClient.invalidateQueries({ queryKey: ['job_roles'] })
                queryClient.invalidateQueries({ queryKey: ['jobs'] })
                queryClient.invalidateQueries({ queryKey: ['pending-jobs'] })
                queryClient.invalidateQueries({ queryKey: ['public-jobs'] })

                // If a specific job was updated, invalidate its detail query
                if (payload.new && 'id' in payload.new) {
                    queryClient.invalidateQueries({ queryKey: ['job', payload.new.id] })
                }

                // Show toast notification if callback provided
                if (onToast) {
                    const eventMessages: Record<string, string> = {
                        'INSERT': 'New job has been created',
                        'UPDATE': 'Job has been updated',
                        'DELETE': 'Job has been removed'
                    }
                    onToast(eventMessages[payload.eventType] || 'Jobs updated')
                }
            }
        )
        .subscribe((status: string) => {
            console.log('[Realtime] job_roles subscription status:', status)
        })

    // Return cleanup function
    return () => {
        if (jobRolesChannel) {
            supabase.removeChannel(jobRolesChannel)
            jobRolesChannel = null
        }
    }
}

/**
 * Subscribe to real-time changes on job_applications table
 */
export function subscribeToApplications(
    queryClient: QueryClient,
    onToast?: ToastCallback
): () => void {
    const supabase = getSupabaseClient()

    if (applicationsChannel) {
        supabase.removeChannel(applicationsChannel)
    }

    applicationsChannel = supabase
        .channel('applications_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'job_applications'
            },
            (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
                console.log('[Realtime] job_applications change:', payload.eventType)

                // Invalidate application queries
                queryClient.invalidateQueries({ queryKey: ['applications'] })

                // Invalidate specific job's applications if job_id available
                if (payload.new && 'job_id' in payload.new) {
                    queryClient.invalidateQueries({
                        queryKey: ['job-applications', payload.new.job_id]
                    })
                }

                if (onToast) {
                    onToast('Applications updated')
                }
            }
        )
        .subscribe()

    return () => {
        if (applicationsChannel) {
            supabase.removeChannel(applicationsChannel)
            applicationsChannel = null
        }
    }
}

/**
 * Subscribe to all relevant tables for admin panel
 * Returns a single cleanup function
 */
export function subscribeToAdminUpdates(
    queryClient: QueryClient,
    onToast?: ToastCallback
): () => void {
    const cleanupJobs = subscribeToJobRoles(queryClient, onToast)
    const cleanupApplications = subscribeToApplications(queryClient, onToast)

    return () => {
        cleanupJobs()
        cleanupApplications()
    }
}

/**
 * Unsubscribe from all realtime channels
 */
export function unsubscribeAll(): void {
    const supabase = getSupabaseClient()

    if (jobRolesChannel) {
        supabase.removeChannel(jobRolesChannel)
        jobRolesChannel = null
    }

    if (applicationsChannel) {
        supabase.removeChannel(applicationsChannel)
        applicationsChannel = null
    }
}
