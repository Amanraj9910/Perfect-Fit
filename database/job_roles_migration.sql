-- Job Role Management System Migration
-- Run this in Supabase SQL Editor
-- Created: 2026-02-04
-- Updated: 2026-02-04 (Added RLS fixes)

-- ============================================
-- PART 0: Enable RLS on job_roles (CRITICAL)
-- ============================================
-- This MUST be enabled for policies to work
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 1: Alter job_roles table
-- ============================================

-- Ensure created_by column exists (required for ownership checks)
ALTER TABLE public.job_roles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add status column with check constraint
ALTER TABLE public.job_roles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add check constraint for status (if not exists pattern for constraints)
DO $$ BEGIN
    ALTER TABLE public.job_roles 
    ADD CONSTRAINT job_roles_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add approval tracking columns
ALTER TABLE public.job_roles 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.job_roles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.job_roles 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add lifecycle columns (for closing jobs)
ALTER TABLE public.job_roles 
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

ALTER TABLE public.job_roles 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Set existing jobs to 'approved' status (so they remain visible)
UPDATE public.job_roles 
SET status = 'approved', 
    approved_at = created_at 
WHERE status IS NULL OR status = 'pending';

-- ============================================
-- PART 2: Create approval_requests table
-- ============================================

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.job_roles(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT approval_requests_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Indexes for approval_requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_job_id 
ON public.approval_requests(job_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status 
ON public.approval_requests(status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_reviewed_by 
ON public.approval_requests(reviewed_by);

-- ============================================
-- PART 3: Create job_applications table
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.job_roles(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'submitted',
    cover_letter TEXT,
    resume_url TEXT,
    phone TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT job_applications_status_check 
    CHECK (status IN ('submitted', 'reviewing', 'shortlisted', 'rejected', 'hired')),
    
    -- Prevent duplicate applications
    CONSTRAINT unique_job_applicant UNIQUE(job_id, applicant_id)
);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Indexes for job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id 
ON public.job_applications(job_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id 
ON public.job_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_status 
ON public.job_applications(status);

-- ============================================
-- PART 4: Indexes for job_roles
-- ============================================

CREATE INDEX IF NOT EXISTS idx_job_roles_status 
ON public.job_roles(status);

CREATE INDEX IF NOT EXISTS idx_job_roles_is_open 
ON public.job_roles(is_open);

CREATE INDEX IF NOT EXISTS idx_job_roles_status_open 
ON public.job_roles(status, is_open) 
WHERE status = 'approved' AND is_open = true;

-- ============================================
-- PART 5: RLS Policies for job_roles
-- ============================================

-- Anyone (anon AND authenticated) can view approved open jobs
-- IMPORTANT: Must include both roles - authenticated users do NOT inherit anon permissions
CREATE POLICY "Anyone can view approved open jobs"
ON public.job_roles
FOR SELECT
TO anon, authenticated
USING (status = 'approved' AND is_open = true);

-- Employees can view their own jobs (any status)
CREATE POLICY "Employees view own jobs"
ON public.job_roles
FOR SELECT 
TO authenticated
USING (created_by = auth.uid());

-- HR/Admin can view all jobs
CREATE POLICY "HR/Admin view all jobs"
ON public.job_roles
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('hr', 'admin')
    )
);

-- ============================================
-- PART 6: RLS Policies for approval_requests
-- ============================================

-- HR/Admin can view all approval requests
CREATE POLICY "HR/Admin view all approval requests" 
ON public.approval_requests
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('hr', 'admin')
    )
);

-- Employees can view approval requests for their own jobs
CREATE POLICY "Employees view own job approval requests" 
ON public.approval_requests
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.job_roles 
        WHERE job_roles.id = approval_requests.job_id 
        AND job_roles.created_by = auth.uid()
    )
);

-- Employees can create approval requests for their own jobs
CREATE POLICY "Employees create approval requests"
ON public.approval_requests
FOR INSERT
TO authenticated
WITH CHECK (requested_by = auth.uid());

-- ============================================
-- PART 7: RLS Policies for job_applications
-- ============================================

-- Applicants can view their own applications
CREATE POLICY "Applicants view own applications" 
ON public.job_applications
FOR SELECT 
TO authenticated
USING (applicant_id = auth.uid());

-- Applicants can apply for approved and open jobs only
CREATE POLICY "Applicants can apply for open jobs" 
ON public.job_applications
FOR INSERT 
TO authenticated
WITH CHECK (
    applicant_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.job_roles
        WHERE id = job_applications.job_id
        AND status = 'approved'
        AND is_open = true
    )
);

-- HR/Admin can view all applications
CREATE POLICY "HR/Admin view all applications" 
ON public.job_applications
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('hr', 'admin')
    )
);

-- HR/Admin can update application status
CREATE POLICY "HR/Admin update applications" 
ON public.job_applications
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('hr', 'admin')
    )
);

-- ============================================
-- PART 8: Updated_at trigger for job_applications
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON public.job_applications;

CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DOCUMENTATION / DESIGN NOTES
-- ============================================
/*
IMPORTANT: Status Storage Design

job_roles.status → Current approval state (pending/approved/rejected)
                   This is the SOURCE OF TRUTH for job visibility

approval_requests → History/audit log for tracking:
                    - Who requested approval
                    - Who reviewed it
                    - When actions occurred
                    - Re-approval history after edits

Rule: Always read status from job_roles, never from approval_requests.
      approval_requests is for audit/history purposes only.
*/

COMMENT ON TABLE public.approval_requests IS 'Audit log for job role approval workflow - NOT the source of truth for current status';
COMMENT ON TABLE public.job_applications IS 'Candidate applications for approved and open job roles';
COMMENT ON COLUMN public.job_roles.status IS 'Current approval state: pending, approved, or rejected - SOURCE OF TRUTH';
COMMENT ON COLUMN public.job_roles.is_open IS 'Whether the job is accepting applications (true = open, false = closed)';

-- ============================================
-- DONE
-- ============================================
