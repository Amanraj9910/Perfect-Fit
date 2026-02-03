-- Fix Infinite Recursion in RLS Policies

-- 1. Create a secure function to get the current user's role
-- This function runs with SECURITY DEFINER privileges to bypass RLS when reading the role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$;

-- 2. Update Policies to use the new function instead of direct table queries

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "HR and Recruiters can view all" ON public.profiles;

-- Re-create policies using get_my_role()

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    get_my_role() = 'admin'
  );

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    get_my_role() = 'admin'
  );

-- HR and Recruiters can view all profiles
CREATE POLICY "HR and Recruiters can view all" ON public.profiles
  FOR SELECT USING (
    get_my_role() IN ('hr', 'recruiter', 'admin')
  );

-- Ensure users can always view their own profile (usually basic requirement)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
  );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
