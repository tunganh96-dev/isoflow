alter table documents
  add column if not exists process_importance text not null default 'medium'
  check (process_importance in ('high', 'medium', 'low'));

create table if not exists work_areas (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz default now(),
  unique (department_id, code)
);

create table if not exists job_positions (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  work_area_id uuid references work_areas(id) on delete set null,
  title text not null,
  role_type text not null default 'worker' check (role_type in ('worker', 'supervisor', 'manager')),
  created_at timestamptz default now()
);

create table if not exists job_position_processes (
  job_position_id uuid references job_positions(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  included boolean not null default true,
  assigned_at timestamptz default now(),
  primary key (job_position_id, document_id)
);

create table if not exists job_monthly_checklist_plans (
  id uuid primary key default gen_random_uuid(),
  job_position_id uuid not null references job_positions(id) on delete cascade,
  month text not null,
  plan jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  generated_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references users(id),
  unique (job_position_id, month)
);

alter table users
  add column if not exists work_area_id uuid references work_areas(id) on delete set null,
  add column if not exists job_position_id uuid references job_positions(id) on delete set null;

alter table work_areas enable row level security;
alter table job_positions enable row level security;
alter table job_position_processes enable row level security;
alter table job_monthly_checklist_plans enable row level security;

drop policy if exists "work_areas_read" on work_areas;
create policy "work_areas_read" on work_areas for select using (auth.uid() is not null);
drop policy if exists "work_areas_manage" on work_areas;
create policy "work_areas_manage" on work_areas for all using (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
) with check (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
);

drop policy if exists "job_positions_read" on job_positions;
create policy "job_positions_read" on job_positions for select using (auth.uid() is not null);
drop policy if exists "job_positions_manage" on job_positions;
create policy "job_positions_manage" on job_positions for all using (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
) with check (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
);

drop policy if exists "job_position_processes_read" on job_position_processes;
create policy "job_position_processes_read" on job_position_processes for select using (auth.uid() is not null);
drop policy if exists "job_position_processes_manage" on job_position_processes;
create policy "job_position_processes_manage" on job_position_processes for all using (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
) with check (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
);

drop policy if exists "job_monthly_plans_read" on job_monthly_checklist_plans;
create policy "job_monthly_plans_read" on job_monthly_checklist_plans for select using (auth.uid() is not null);
drop policy if exists "job_monthly_plans_manage" on job_monthly_checklist_plans;
create policy "job_monthly_plans_manage" on job_monthly_checklist_plans for all using (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
) with check (
  exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin', 'coo', 'factory_admin')
  )
);
