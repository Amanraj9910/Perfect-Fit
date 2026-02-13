-- Add FK constraints for created_by and approved_by in job_roles
ALTER TABLE job_roles
DROP CONSTRAINT IF EXISTS job_roles_created_by_fkey,
ADD CONSTRAINT job_roles_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

ALTER TABLE job_roles
DROP CONSTRAINT IF EXISTS job_roles_approved_by_fkey,
ADD CONSTRAINT job_roles_approved_by_fkey
FOREIGN KEY (approved_by)
REFERENCES profiles(id)
ON DELETE SET NULL;
