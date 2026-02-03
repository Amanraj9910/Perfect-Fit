-- Job Roles Table for Employee Portal
-- Run this in Supabase SQL Editor

-- Create job_roles table
CREATE TABLE IF NOT EXISTS public.job_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read job roles
CREATE POLICY "Anyone can view job roles"
    ON public.job_roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Employees can create job roles
CREATE POLICY "Employees can create job roles"
    ON public.job_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('employee', 'admin')
        )
    );

-- Policy: Employees can update their own job roles
CREATE POLICY "Employees can update own job roles"
    ON public.job_roles
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Policy: Employees can delete their own job roles, admins can delete any
CREATE POLICY "Employees can delete own job roles"
    ON public.job_roles
    FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_roles_created_by ON public.job_roles(created_by);
CREATE INDEX IF NOT EXISTS idx_job_roles_department ON public.job_roles(department);
