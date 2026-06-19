create table if not exists document_resources (
  id uuid primary key default gen_random_uuid(),
  resource_code text not null unique,
  name text not null,
  description text not null,
  resource_type text not null default 'form' check (resource_type in ('form', 'record', 'reference', 'other')),
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

create index if not exists idx_document_resource_links_resource_id
  on document_resource_links (resource_id);

alter table document_resources enable row level security;
alter table document_resource_links enable row level security;

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
