-- Add new columns to job_roles table
ALTER TABLE job_roles 
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS work_mode TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS salary_min NUMERIC,
ADD COLUMN IF NOT EXISTS salary_max NUMERIC,
ADD COLUMN IF NOT EXISTS key_business_objective TEXT,
ADD COLUMN IF NOT EXISTS min_experience INTEGER,
ADD COLUMN IF NOT EXISTS is_english_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_coding_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_technical_required BOOLEAN DEFAULT FALSE;

-- Create job_responsibilities table
CREATE TABLE IF NOT EXISTS job_responsibilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES job_roles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    importance TEXT CHECK (importance IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create job_skills table
CREATE TABLE IF NOT EXISTS job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES job_roles(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    min_years INTEGER DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS Policies
ALTER TABLE job_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone for approved/open jobs
CREATE POLICY "Public can view responsibilities for open jobs" 
ON job_responsibilities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM job_roles 
        WHERE job_roles.id = job_responsibilities.job_id 
        AND job_roles.status = 'approved' 
        AND job_roles.is_open = true
    )
);

CREATE POLICY "Public can view skills for open jobs" 
ON job_skills FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM job_roles 
        WHERE job_roles.id = job_skills.job_id 
        AND job_roles.status = 'approved' 
        AND job_roles.is_open = true
    )
);

-- Allow employees/admins to see all skills/responsibilities
CREATE POLICY "Employees/Admins can view all skills"
ON job_skills FOR SELECT
USING (
    auth.role() = 'authenticated'
);

CREATE POLICY "Employees/Admins can view all responsibilities"
ON job_responsibilities FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- Allow employees to manage their own job skills/responsibilities
CREATE POLICY "Employees can manage responsibilities for their jobs"
ON job_responsibilities FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM job_roles
        WHERE job_roles.id = job_responsibilities.job_id
        AND job_roles.created_by = auth.uid()
    )
);

CREATE POLICY "Employees can manage skills for their jobs"
ON job_skills FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM job_roles
        WHERE job_roles.id = job_skills.job_id
        AND job_roles.created_by = auth.uid()
    )
);

-- Allow admins to manage everything
CREATE POLICY "Admins can manage all responsibilities"
ON job_responsibilities FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Admins can manage all skills"
ON job_skills FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
