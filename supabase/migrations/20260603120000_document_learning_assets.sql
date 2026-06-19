create table if not exists document_learning_assets (
  document_id uuid primary key references documents(id) on delete cascade,
  summary_card jsonb not null default '{}'::jsonb,
  quiz jsonb not null default '[]'::jsonb,
  worker_verification jsonb not null default '{}'::jsonb,
  manager_confirmation jsonb not null default '{}'::jsonb,
  cross_audit_frequency text not null default 'monthly' check (cross_audit_frequency in ('none', 'monthly', 'quarterly')),
  audit_checklist jsonb not null default '[]'::jsonb,
  generated_by uuid references users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists document_read_confirmations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  quiz_answers jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  total integer not null default 0,
  passed boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (document_id, user_id)
);

create index if not exists idx_document_read_confirmations_document
  on document_read_confirmations (document_id);

create or replace function update_learning_asset_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists document_learning_assets_updated_at on document_learning_assets;
create trigger document_learning_assets_updated_at
  before update on document_learning_assets
  for each row execute function update_learning_asset_updated_at();

drop trigger if exists document_read_confirmations_updated_at on document_read_confirmations;
create trigger document_read_confirmations_updated_at
  before update on document_read_confirmations
  for each row execute function update_learning_asset_updated_at();

alter table document_learning_assets enable row level security;
alter table document_read_confirmations enable row level security;

drop policy if exists "learning_assets_read" on document_learning_assets;
create policy "learning_assets_read" on document_learning_assets
  for select using (auth.uid() is not null);

drop policy if exists "learning_assets_insert" on document_learning_assets;
create policy "learning_assets_insert" on document_learning_assets
  for insert with check (
    public.can_create_quality_record()
  );

drop policy if exists "learning_assets_update" on document_learning_assets;
create policy "learning_assets_update" on document_learning_assets
  for update using (
    public.can_create_quality_record()
  );

drop policy if exists "read_confirmations_read" on document_read_confirmations;
create policy "read_confirmations_read" on document_read_confirmations
  for select using (
    user_id = auth.uid()
    or public.is_admin_user()
  );

drop policy if exists "read_confirmations_insert_own" on document_read_confirmations;
create policy "read_confirmations_insert_own" on document_read_confirmations
  for insert with check (user_id = auth.uid());

drop policy if exists "read_confirmations_update_own" on document_read_confirmations;
create policy "read_confirmations_update_own" on document_read_confirmations
  for update using (user_id = auth.uid());
