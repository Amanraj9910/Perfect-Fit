-- Create technical_assessments table
create table if not exists public.technical_assessments (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.job_roles(id) on delete cascade not null,
  question text not null,
  desired_answer text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.technical_assessments enable row level security;

-- Policies
create policy "Public read access for technical_assessments"
  on public.technical_assessments for select
  using ( true );

create policy "Employees can insert technical_assessments"
  on public.technical_assessments for insert
  with check ( auth.role() = 'authenticated' );

create policy "Employees can update technical_assessments"
  on public.technical_assessments for update
  using ( auth.role() = 'authenticated' );

create policy "Employees can delete technical_assessments"
  on public.technical_assessments for delete
  using ( auth.role() = 'authenticated' );
