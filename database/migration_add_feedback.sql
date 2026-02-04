-- Migration: Add feedback column to job_applications
ALTER TABLE public.job_applications 
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Migration: Add job_title to job_applications view if we were creating one, 
-- but for now just the column status update.
