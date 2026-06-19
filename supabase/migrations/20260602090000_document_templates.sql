create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  doc_type text not null check (doc_type in (
    'sop','work_instruction','quality_policy',
    'audit_checklist','ncr_report','capa_report','risk_register'
  )),
  content text not null,
  is_active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_document_templates_doc_type_active
  on document_templates (doc_type, is_active);

alter table document_templates enable row level security;

drop policy if exists "Managers can manage document templates" on document_templates;
create policy "Managers can manage document templates" on document_templates
  for all using (is_admin_user())
  with check (is_admin_user());

drop policy if exists "Authenticated users can read active document templates" on document_templates;
create policy "Authenticated users can read active document templates" on document_templates
  for select using (auth.uid() is not null and is_active = true);
