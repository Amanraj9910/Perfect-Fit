-- Migration: Performance & Security Improvements
-- Purpose: Optimize RLS policies and harden security
-- Date: 2026-02-05

-- ============================================
-- RLS Performance Optimizations
-- ============================================
-- Wrap auth functions to prevent per-row execution
-- This significantly improves query performance

-- Example pattern (apply to all policies using auth.uid()):
-- Before: auth.uid() = created_by
-- After: (select auth.uid()) = created_by

-- Update job_roles policies
DROP POLICY IF EXISTS job_roles_select_policy ON job_roles;
CREATE POLICY job_roles_select_policy ON job_roles
    FOR SELECT USING (
        status = 'approved' AND is_open = true
        OR (select auth.uid()) = created_by
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'hr')
        )
    );

DROP POLICY IF EXISTS job_roles_insert_policy ON job_roles;
CREATE POLICY job_roles_insert_policy ON job_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'employee')
        )
    );

DROP POLICY IF EXISTS job_roles_update_policy ON job_roles;
CREATE POLICY job_roles_update_policy ON job_roles
    FOR UPDATE USING (
        (select auth.uid()) = created_by
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (select auth.uid()) 
            AND role IN ('admin', 'hr')
        )
    );

DROP POLICY IF EXISTS job_roles_delete_policy ON job_roles;
CREATE POLICY job_roles_delete_policy ON job_roles
    FOR DELETE USING (
        (select auth.uid()) = created_by
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
    );

-- ============================================
-- Security Hardening
-- ============================================
-- Set search_path for all custom functions

-- Update the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- Policy Audit Notes
-- ============================================
-- Review these policies manually:
-- 1. profiles table - ensure no unintended anon access
-- 2. candidate_profiles table - ensure proper access control
-- 3. Consolidate any overlapping permissive policies
