-- ============================================================
-- ISOFlow Phase 1 Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Factories
create table if not exists factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz default now()
);

-- Departments
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid references factories(id) on delete cascade,
  name text not null,
  code text not null,
  exclude_from_cross_audit boolean default false,
  created_at timestamptz default now()
);

-- Users (extends auth.users)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('super_admin','coo','factory_admin','department_head','employee')),
  factory_id uuid references factories(id),
  department_id uuid references departments(id),
  created_at timestamptz default now()
);

-- Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  doc_code text not null,
  title text not null,
  doc_type text not null check (doc_type in (
    'sop','work_instruction','quality_policy',
    'audit_checklist','ncr_report','capa_report','risk_register'
  )),
  content text not null,
  mermaid_code text,
  version integer not null default 1,
  status text not null default 'draft' check (status in (
    'draft','pending_approval','published','under_review','archived'
  )),
  factory_id uuid references factories(id),
  department_id uuid references departments(id),
  parent_doc_id uuid references documents(id),
  is_addendum boolean default false,
  owner_id uuid references users(id),
  approved_by uuid references users(id),
  approved_at timestamptz,
  revision_type text check (revision_type in ('minor','major')),
  revision_summary text,
  previous_version_id uuid references documents(id),
  review_date date,
  source_file_url text,
  flowchart_image_path text,
  flowchart_image_mime text,
  process_importance text not null default 'medium' check (process_importance in ('high', 'medium', 'low')),
  process_importance_level integer not null default 3 check (process_importance_level between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_documents_doc_code_version_unique
  on documents (doc_code, version);
create index if not exists idx_documents_status_updated_at
  on documents (status, updated_at desc);
create index if not exists idx_documents_doc_code_version
  on documents (doc_code, version desc);

-- Document assignments
create table if not exists document_assignments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  factory_id uuid references factories(id),
  department_id uuid references departments(id),
  assigned_by uuid references users(id),
  assigned_at timestamptz default now()
);
create index if not exists idx_document_assignments_document_id
  on document_assignments (document_id);
create index if not exists idx_document_assignments_department_id
  on document_assignments (department_id);

-- Reusable forms, records and supporting documents linked to processes
create table if not exists document_resources (
  id uuid primary key default gen_random_uuid(),
  resource_code text not null unique,
  name text not null,
  description text not null,
  resource_type text not null default 'form' check (resource_type in ('form', 'record', 'reference', 'other')),
  department_id uuid references departments(id),
  retention_period text,
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists document_resource_links (
  document_id uuid references documents(id) on delete cascade,
  resource_id uuid references document_resources(id) on delete cascade,
  linked_by uuid references users(id),
  linked_at timestamptz default now(),
  primary key (document_id, resource_id)
);

create index if not exists idx_document_resources_created_at
  on document_resources (created_at desc);
create index if not exists idx_document_resources_department_id
  on document_resources (department_id);
create index if not exists idx_document_resource_links_resource_id
  on document_resource_links (resource_id);

-- NCRs
create table if not exists ncrs (
  id uuid primary key default gen_random_uuid(),
  ncr_code text not null unique,
  description text not null,
  reporter_name text,
  iso_clause text,
  severity text not null check (severity in ('minor','major','critical')),
  factory_id uuid references factories(id),
  department_id uuid references departments(id),
  raised_by uuid references users(id),
  assigned_to uuid references users(id),
  due_date date,
  status text not null default 'open' check (status in (
    'open','analysing','pending_capa_approval',
    'implementing','pending_verification',
    'pending_doc_update','completed'
  )),
  root_cause_analysis text,
  proposed_capa text,
  capa_approved_by uuid references users(id),
  capa_approved_at timestamptz,
  capa_rejection_notes text,
  implementation_notes text,
  implementation_evidence_urls text[],
  verification_notes text,
  verified_by uuid references users(id),
  verified_at timestamptz,
  process_change_required boolean default false,
  linked_document_id uuid references documents(id),
  closure_report text,
  closure_approved_by uuid references users(id),
  closure_approved_at timestamptz,
  photo_urls text[],
  raised_at timestamptz default now(),
  closed_at timestamptz
);
create index if not exists idx_ncrs_status_raised_at
  on ncrs (status, raised_at desc);

-- NCR activity log
create table if not exists ncr_activity (
  id uuid primary key default gen_random_uuid(),
  ncr_id uuid references ncrs(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_ncr_activity_ncr_created_at
  on ncr_activity (ncr_id, created_at desc);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_created_at
  on notifications (user_id, created_at desc);

-- ============================================================
-- Auto-update updated_at on documents
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table factories enable row level security;
alter table departments enable row level security;
alter table users enable row level security;
alter table documents enable row level security;
alter table document_assignments enable row level security;
alter table document_resources enable row level security;
alter table document_resource_links enable row level security;
alter table ncrs enable row level security;
alter table ncr_activity enable row level security;
alter table notifications enable row level security;

-- Factories: all authenticated users can read
create policy "factories_read" on factories
  for select using (auth.uid() is not null);

-- Departments: all authenticated users can read
create policy "departments_read" on departments
  for select using (auth.uid() is not null);

-- Helper functions to avoid infinite recursion in users RLS
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin','coo','factory_admin')
  );
$$;

create or replace function public.can_create_quality_record()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role in ('super_admin','coo','factory_admin','department_head')
  );
$$;

-- Users: users can read own row; admins read all
create policy "users_read" on users
  for select using (
    id = auth.uid()
    or public.is_admin_user()
  );

create policy "users_insert_own" on users
  for insert with check (id = auth.uid());

-- Published documents are visible to assigned departments. Documents without
-- department assignments apply company-wide.
create policy "documents_read" on documents
  for select using (
    public.is_admin_user()
    or owner_id = auth.uid()
    or (
      status = 'published'
      and (
        not exists (
          select 1 from document_assignments da
          where da.document_id = documents.id
        )
        or exists (
          select 1
          from document_assignments da
          join users u on u.id = auth.uid()
          where da.document_id = documents.id
            and da.department_id = u.department_id
        )
      )
    )
    or exists (
      select 1
      from document_assignments da
      join users u on u.id = auth.uid()
      where da.document_id = documents.id
        and u.role = 'department_head'
        and da.department_id = u.department_id
    )
  );

create policy "documents_insert" on documents
  for insert with check (
    public.can_create_quality_record()
  );

create policy "documents_update" on documents
  for update using (
    public.is_admin_user()
    or (
      status = 'draft'
      and (
        owner_id = auth.uid()
        or exists (
          select 1
          from document_assignments da
          join users u on u.id = auth.uid()
          where da.document_id = documents.id
            and u.role = 'department_head'
            and da.department_id = u.department_id
        )
      )
    )
  )
  with check (
    public.is_admin_user()
    or (
      status in ('draft', 'pending_approval')
      and (
        owner_id = auth.uid()
        or exists (
          select 1
          from document_assignments da
          join users u on u.id = auth.uid()
          where da.document_id = documents.id
            and u.role = 'department_head'
            and da.department_id = u.department_id
        )
      )
    )
  );

create policy "documents_delete_draft" on documents
  for delete using (
    status = 'draft'
    and (
      public.is_admin_user()
      or owner_id = auth.uid()
      or exists (
        select 1
        from document_assignments da
        join users u on u.id = auth.uid()
        where da.document_id = documents.id
          and u.role = 'department_head'
          and da.department_id = u.department_id
      )
    )
  );

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

alter table iso_checklist_instances enable row level security;
create policy "iso_checklist_instances_read_own" on iso_checklist_instances
  for select using (user_id = auth.uid());
create policy "iso_checklist_instances_update_own" on iso_checklist_instances
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Document assignments: all authenticated users can read
create policy "doc_assignments_read" on document_assignments
  for select using (auth.uid() is not null);

create policy "doc_assignments_insert" on document_assignments
  for insert with check (
    public.can_create_quality_record()
  );
create policy "doc_assignments_delete" on document_assignments
  for delete using (public.can_create_quality_record());

create policy "document_resources_read" on document_resources
  for select using (auth.uid() is not null);
create policy "document_resources_insert" on document_resources
  for insert with check (public.can_create_quality_record());
create policy "document_resources_update" on document_resources
  for update using (public.can_create_quality_record());
create policy "document_resource_links_read" on document_resource_links
  for select using (auth.uid() is not null);
create policy "document_resource_links_insert" on document_resource_links
  for insert with check (public.can_create_quality_record());
create policy "document_resource_links_delete" on document_resource_links
  for delete using (public.can_create_quality_record());

-- NCRs: scoped by factory
create policy "ncrs_read" on ncrs
  for select using (
    public.is_admin_user()
    or factory_id = (select factory_id from users where id = auth.uid())
  );

create policy "ncrs_insert" on ncrs
  for insert with check (
    public.can_create_quality_record()
  );

create policy "ncrs_update" on ncrs
  for update using (
    public.is_admin_user()
    or factory_id = (select factory_id from users where id = auth.uid())
  );

-- NCR activity: scoped to factory
create policy "ncr_activity_read" on ncr_activity
  for select using (
    exists (
      select 1 from ncrs n
      join users u on u.id = auth.uid()
      where n.id = ncr_id
      and (u.role in ('super_admin','coo','factory_admin') or n.factory_id = u.factory_id)
    )
  );

create policy "ncr_activity_insert" on ncr_activity
  for insert with check (auth.uid() is not null);

-- Notifications: own only
create policy "notifications_read" on notifications
  for select using (user_id = auth.uid());

create policy "notifications_update" on notifications
  for update using (user_id = auth.uid());

create policy "notifications_insert" on notifications
  for insert with check (auth.uid() is not null);

-- ============================================================
-- Seed data
-- ============================================================

-- Factories
insert into factories (name, code) values
  ('Quế Võ', 'QVO'),
  ('Long An', 'LA'),
  ('Thường Tín', 'TT'),
  ('Trụ sở', 'HQ')
on conflict (code) do nothing;

-- Departments (seeded for all factories; R&D only for QVO)
do $$
declare
  f_qvo uuid;
  f_la  uuid;
  f_tt  uuid;
  f_hq  uuid;
begin
  select id into f_qvo from factories where code = 'QVO';
  select id into f_la  from factories where code = 'LA';
  select id into f_tt  from factories where code = 'TT';
  select id into f_hq  from factories where code = 'HQ';

  -- QVO departments
  insert into departments (factory_id, name, code, exclude_from_cross_audit) values
    (f_qvo, 'Sản xuất Converting', 'SC', false),
    (f_qvo, 'Sản xuất Paper Machine', 'SP', false),
    (f_qvo, 'Kho & Logistics', 'KL', false),
    (f_qvo, 'Kỹ thuật và Bảo Trì', 'KT', false),
    (f_qvo, 'HR', 'HR', false),
    (f_qvo, 'Kế Toán', 'KT2', false),
    (f_qvo, 'Kế Hoạch', 'KH', false),
    (f_qvo, 'ISO', 'ISO', true),
    (f_qvo, 'QC', 'QC', false),
    (f_qvo, 'R&D', 'RD', false);

  -- LA departments (no R&D)
  insert into departments (factory_id, name, code, exclude_from_cross_audit) values
    (f_la, 'Sản xuất Converting', 'SC', false),
    (f_la, 'Sản xuất Paper Machine', 'SP', false),
    (f_la, 'Kho & Logistics', 'KL', false),
    (f_la, 'Kỹ thuật và Bảo Trì', 'KT', false),
    (f_la, 'HR', 'HR', false),
    (f_la, 'Kế Toán', 'KT2', false),
    (f_la, 'Kế Hoạch', 'KH', false),
    (f_la, 'ISO', 'ISO', true),
    (f_la, 'QC', 'QC', false);

  -- TT departments (no R&D)
  insert into departments (factory_id, name, code, exclude_from_cross_audit) values
    (f_tt, 'Sản xuất Converting', 'SC', false),
    (f_tt, 'Sản xuất Paper Machine', 'SP', false),
    (f_tt, 'Kho & Logistics', 'KL', false),
    (f_tt, 'Kỹ thuật và Bảo Trì', 'KT', false),
    (f_tt, 'HR', 'HR', false),
    (f_tt, 'Kế Toán', 'KT2', false),
    (f_tt, 'Kế Hoạch', 'KH', false),
    (f_tt, 'ISO', 'ISO', true),
    (f_tt, 'QC', 'QC', false);

  -- HQ departments
  insert into departments (factory_id, name, code, exclude_from_cross_audit) values
    (f_hq, 'ISO', 'ISO', true),
    (f_hq, 'QC', 'QC', false),
    (f_hq, 'HR', 'HR', false);
end $$;
