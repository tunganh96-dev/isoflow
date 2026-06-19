create table if not exists iso_checklist_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  checklist_date date not null,
  job_position_id uuid references job_positions(id) on delete set null,
  factory_id uuid references factories(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  checklist_type text not null check (checklist_type in ('sop_verification', 'manager_confirmation')),
  questions jsonb not null default '[]'::jsonb,
  responses jsonb not null default '{}'::jsonb,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted')),
  late_reason text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checklist_date)
);

create index if not exists idx_iso_checklist_instances_user_date
  on iso_checklist_instances (user_id, checklist_date desc);
create index if not exists idx_iso_checklist_instances_department_date
  on iso_checklist_instances (department_id, checklist_date desc);
create index if not exists idx_iso_checklist_instances_factory_date
  on iso_checklist_instances (factory_id, checklist_date desc);

drop trigger if exists iso_checklist_instances_updated_at on iso_checklist_instances;
create trigger iso_checklist_instances_updated_at
  before update on iso_checklist_instances
  for each row execute function update_updated_at();

alter table iso_checklist_instances enable row level security;

drop policy if exists "iso_checklist_instances_read_own" on iso_checklist_instances;
create policy "iso_checklist_instances_read_own" on iso_checklist_instances
  for select using (user_id = auth.uid());

drop policy if exists "iso_checklist_instances_update_own" on iso_checklist_instances;
create policy "iso_checklist_instances_update_own" on iso_checklist_instances
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
