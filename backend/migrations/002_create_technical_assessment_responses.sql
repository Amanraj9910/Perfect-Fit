-- Create technical_assessment_responses table
create table if not exists public.technical_assessment_responses (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.job_applications(id) on delete cascade not null,
  question_id uuid references public.technical_assessments(id) on delete cascade not null,
  answer text not null,
  ai_score integer,
  ai_reasoning text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(application_id, question_id)
);

-- Enable RLS
alter table public.technical_assessment_responses enable row level security;

-- Policies
create policy "Candidates can insert their own responses"
  on public.technical_assessment_responses for insert
  with check ( 
    auth.role() = 'authenticated' AND 
    exists (
      select 1 from public.job_applications 
      where id = application_id and applicant_id = auth.uid()
    )
  );

create policy "Candidates can view their own responses"
  on public.technical_assessment_responses for select
  using (
      auth.uid() in (
          select applicant_id from public.job_applications where id = application_id
      )
  );

create policy "Employees/Admins can view responses"
  on public.technical_assessment_responses for select
  using (
      exists (
          select 1 from public.profiles 
          where id = auth.uid() and role in ('admin', 'employee')
      )
  );

-- Allow updates (e.g. for AI scoring to write back if run as service role, or if we want to allow re-scoring)
create policy "Service role can update scores"
    on public.technical_assessment_responses for update
    using ( true ); -- Typically service role bypasses RLS, but explicit policy is safe
