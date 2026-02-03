-- Perfect-Fit: Add RBAC Role to Existing Profiles Table
-- Run this in Supabase SQL Editor

-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'candidate' 
CHECK (role IN ('candidate', 'employee', 'hr', 'recruiter', 'admin'));

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- RLS Policies for role-based access
-- (Drop existing policies first to avoid conflicts)

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update any profile (for role assignment)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- HR and Recruiters can view all profiles
DROP POLICY IF EXISTS "HR and Recruiters can view all" ON public.profiles;
CREATE POLICY "HR and Recruiters can view all" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('hr', 'recruiter', 'admin')
    )
  );
