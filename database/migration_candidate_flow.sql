-- Migration: Candidate Profiles and Application Updates
-- Run this in Supabase SQL Editor

-- 1. Create candidate_profiles table
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    resume_url TEXT,
    profile_pic_url TEXT,
    skills TEXT,
    experience_years INTEGER,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Policy: Candidates can view their own profile
CREATE POLICY "Candidates can view own profile"
    ON public.candidate_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Candidates can update their own profile
CREATE POLICY "Candidates can update own profile"
    ON public.candidate_profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Candidates can insert their own profile
CREATE POLICY "Candidates can insert own profile"
    ON public.candidate_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy: Admin, HR, Recruiter can view all profiles
CREATE POLICY "Recruiters/Admins can view all candidate profiles"
    ON public.candidate_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr', 'recruiter')
        )
    );

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_candidate_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_candidate_profiles_timestamp
    BEFORE UPDATE ON public.candidate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_profiles_updated_at();

-- 5. Ensure job_applications policies exist for Admin viewing (if not already)
-- Generally, we want Admins to be able to UPDATE job_applications status
-- Existing policies might only cover creation. Adding explicit Admin update policy.

DROP POLICY IF EXISTS "Admins can update job applications" ON public.job_applications;
CREATE POLICY "Admins can update job applications"
    ON public.job_applications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr')
        )
    );

-- Admins can view all applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.job_applications;
CREATE POLICY "Admins can view all applications"
    ON public.job_applications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'hr')
        )
    );
