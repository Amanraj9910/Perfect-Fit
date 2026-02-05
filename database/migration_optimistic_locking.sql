-- Migration: Optimistic Locking for Job Roles
-- Purpose: Add version column to job_roles table for concurrency control
-- Date: 2026-02-05

-- Add version column with default value of 1
ALTER TABLE job_roles 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Update existing records to have version 1
UPDATE job_roles SET version = 1 WHERE version IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN job_roles.version IS 'Optimistic locking version number, incremented on each update';
