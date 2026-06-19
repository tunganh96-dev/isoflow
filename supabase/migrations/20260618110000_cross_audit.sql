-- Cross audit settings: which processes are included per department
create table if not exists cross_audit_process_scope (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references factories(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  added_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (factory_id, department_id, document_id)
);

create index if not exists idx_cross_audit_scope_dept
  on cross_audit_process_scope (factory_id, department_id);

alter table cross_audit_process_scope enable row level security;

drop policy if exists "cross_audit_scope_read" on cross_audit_process_scope;
create policy "cross_audit_scope_read" on cross_audit_process_scope
  for select using (true);

drop policy if exists "cross_audit_scope_manage" on cross_audit_process_scope;
create policy "cross_audit_scope_manage" on cross_audit_process_scope
  for all using (
    auth.uid() in (
      select id from users where role in ('super_admin', 'coo', 'factory_admin', 'qa_manager', 'qa_employee')
    )
  );

-- Monthly cross audit cycle: which dept audits which dept
create table if not exists cross_audit_cycles (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references factories(id) on delete cascade,
  month text not null,  -- '2026-06'
  auditor_department_id uuid not null references departments(id) on delete cascade,
  target_department_id uuid not null references departments(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'completed')),
  confirmed_by uuid references users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (factory_id, month, auditor_department_id)
);

create index if not exists idx_cross_audit_cycles_month
  on cross_audit_cycles (factory_id, month);

alter table cross_audit_cycles enable row level security;

drop policy if exists "cross_audit_cycles_read" on cross_audit_cycles;
create policy "cross_audit_cycles_read" on cross_audit_cycles
  for select using (true);

drop policy if exists "cross_audit_cycles_manage" on cross_audit_cycles;
create policy "cross_audit_cycles_manage" on cross_audit_cycles
  for all using (
    auth.uid() in (
      select id from users where role in ('super_admin', 'coo', 'factory_admin', 'qa_manager', 'qa_employee')
    )
  );

-- Individual cross audit instance: the actual audit done by a department head
create table if not exists cross_audit_instances (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cross_audit_cycles(id) on delete cascade,
  auditor_id uuid not null references users(id) on delete cascade,
  factory_id uuid not null references factories(id) on delete cascade,
  target_department_id uuid not null references departments(id) on delete cascade,
  month text not null,
  questions jsonb not null default '[]'::jsonb,
  responses jsonb not null default '{}'::jsonb,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'reviewed')),
  submitted_at timestamptz,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, auditor_id)
);

create index if not exists idx_cross_audit_instances_auditor
  on cross_audit_instances (auditor_id, month desc);
create index if not exists idx_cross_audit_instances_factory_month
  on cross_audit_instances (factory_id, month desc);

drop trigger if exists cross_audit_instances_updated_at on cross_audit_instances;
create trigger cross_audit_instances_updated_at
  before update on cross_audit_instances
  for each row execute function update_updated_at();

alter table cross_audit_instances enable row level security;

drop policy if exists "cross_audit_instances_read" on cross_audit_instances;
create policy "cross_audit_instances_read" on cross_audit_instances
  for select using (
    auditor_id = auth.uid()
    or auth.uid() in (
      select id from users where role in ('super_admin', 'coo', 'factory_admin', 'qa_manager', 'qa_employee')
    )
  );

drop policy if exists "cross_audit_instances_update_own" on cross_audit_instances;
create policy "cross_audit_instances_update_own" on cross_audit_instances
  for update using (auditor_id = auth.uid())
  with check (auditor_id = auth.uid());

-- Findings flagged from cross audit for NCR consideration
create table if not exists cross_audit_findings (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references cross_audit_instances(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  question_index integer not null,
  item text not null,
  comment text,
  severity text not null default 'minor' check (severity in ('minor', 'major')),
  ncr_id uuid references ncrs(id) on delete set null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_cross_audit_findings_instance
  on cross_audit_findings (instance_id);

alter table cross_audit_findings enable row level security;

drop policy if exists "cross_audit_findings_read" on cross_audit_findings;
create policy "cross_audit_findings_read" on cross_audit_findings
  for select using (true);

drop policy if exists "cross_audit_findings_manage" on cross_audit_findings;
create policy "cross_audit_findings_manage" on cross_audit_findings
  for all using (
    auth.uid() in (
      select id from users where role in ('super_admin', 'coo', 'factory_admin', 'qa_manager', 'qa_employee', 'department_head')
    )
  );
