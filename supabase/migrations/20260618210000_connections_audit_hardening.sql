begin;

create or replace function public.is_global_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and role in ('super_admin', 'coo')
  );
$$;

create or replace function public.current_user_factory_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select factory_id from users where id = auth.uid();
$$;

create or replace function public.current_user_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from users where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from users where id = auth.uid();
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and role in ('super_admin', 'coo', 'factory_admin')
  );
$$;

drop policy if exists "users_read" on users;
create policy "users_read" on users
  for select using (
    id = auth.uid()
    or public.is_global_admin()
    or (
      factory_id = public.current_user_factory_id()
      and public.current_user_role() = 'factory_admin'
    )
    or (
      department_id = public.current_user_department_id()
      and public.current_user_role() = 'department_head'
    )
  );

drop policy if exists "documents_read" on documents;
create policy "documents_read" on documents
  for select using (
    public.is_global_admin()
    or factory_id is null
    or factory_id = public.current_user_factory_id()
    or owner_id = auth.uid()
    or exists (
      select 1
      from document_assignments da
      join users u on u.id = auth.uid()
      where da.document_id = documents.id
        and da.department_id = u.department_id
    )
  );

drop policy if exists "documents_update" on documents;
create policy "documents_update" on documents
  for update using (
    public.is_global_admin()
    or (
      exists (
        select 1 from users
        where id = auth.uid()
          and role = 'factory_admin'
          and users.factory_id = documents.factory_id
      )
    )
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
    public.is_global_admin()
    or (
      exists (
        select 1 from users
        where id = auth.uid()
          and role = 'factory_admin'
          and users.factory_id = documents.factory_id
      )
    )
    or (
      status in ('draft', 'pending_approval')
      and owner_id = auth.uid()
    )
  );

drop policy if exists "documents_insert" on documents;
create policy "documents_insert" on documents
  for insert with check (
    public.is_global_admin()
    or (
      public.can_create_quality_record()
      and owner_id = auth.uid()
      and (factory_id is null or factory_id = public.current_user_factory_id())
    )
  );

drop policy if exists "doc_assignments_read" on document_assignments;
create policy "doc_assignments_read" on document_assignments
  for select using (
    exists (
      select 1 from documents d
      where d.id = document_assignments.document_id
    )
  );

drop policy if exists "doc_assignments_insert" on document_assignments;
create policy "doc_assignments_insert" on document_assignments
  for insert with check (
    public.is_global_admin()
    or exists (
      select 1 from documents d
      where d.id = document_assignments.document_id
        and (
          d.owner_id = auth.uid()
          or (
            public.current_user_role() = 'factory_admin'
            and (d.factory_id is null or d.factory_id = public.current_user_factory_id())
          )
        )
    )
  );

drop policy if exists "doc_assignments_delete" on document_assignments;
create policy "doc_assignments_delete" on document_assignments
  for delete using (
    public.is_global_admin()
    or exists (
      select 1 from documents d
      where d.id = document_assignments.document_id
        and (
          d.owner_id = auth.uid()
          or (
            public.current_user_role() = 'factory_admin'
            and (d.factory_id is null or d.factory_id = public.current_user_factory_id())
          )
        )
    )
  );

drop policy if exists "ncrs_read" on ncrs;
create policy "ncrs_read" on ncrs
  for select using (
    public.is_global_admin()
    or factory_id = public.current_user_factory_id()
  );

drop policy if exists "ncrs_insert" on ncrs;
create policy "ncrs_insert" on ncrs
  for insert with check (
    public.can_create_quality_record()
    and raised_by = auth.uid()
    and factory_id = public.current_user_factory_id()
  );

drop policy if exists "ncrs_update" on ncrs;
create policy "ncrs_update" on ncrs
  for update using (
    public.is_global_admin()
    or factory_id = public.current_user_factory_id()
  )
  with check (
    public.is_global_admin()
    or factory_id = public.current_user_factory_id()
  );

drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert_own" on notifications
  for insert with check (user_id = auth.uid());

drop policy if exists "cross_audit_scope_read" on cross_audit_process_scope;
create policy "cross_audit_scope_read" on cross_audit_process_scope
  for select using (
    public.is_global_admin()
    or factory_id = public.current_user_factory_id()
  );

drop policy if exists "cross_audit_scope_manage" on cross_audit_process_scope;
create policy "cross_audit_scope_manage" on cross_audit_process_scope
  for all using (
    public.is_global_admin()
    or (
      factory_id = public.current_user_factory_id()
      and public.current_user_role() = 'factory_admin'
    )
  )
  with check (
    public.is_global_admin()
    or (
      factory_id = public.current_user_factory_id()
      and public.current_user_role() = 'factory_admin'
    )
  );

drop policy if exists "cross_audit_cycles_read" on cross_audit_cycles;
create policy "cross_audit_cycles_read" on cross_audit_cycles
  for select using (
    public.is_global_admin()
    or factory_id = public.current_user_factory_id()
  );

drop policy if exists "cross_audit_cycles_manage" on cross_audit_cycles;
create policy "cross_audit_cycles_manage" on cross_audit_cycles
  for all using (
    public.is_global_admin()
    or (
      factory_id = public.current_user_factory_id()
      and public.current_user_role() = 'factory_admin'
    )
  )
  with check (
    public.is_global_admin()
    or (
      factory_id = public.current_user_factory_id()
      and public.current_user_role() = 'factory_admin'
    )
  );

drop policy if exists "cross_audit_instances_read" on cross_audit_instances;
create policy "cross_audit_instances_read" on cross_audit_instances
  for select using (
    auditor_id = auth.uid()
    or public.is_global_admin()
    or (
      factory_id = public.current_user_factory_id()
      and public.current_user_role() = 'factory_admin'
    )
  );

drop policy if exists "cross_audit_findings_read" on cross_audit_findings;
create policy "cross_audit_findings_read" on cross_audit_findings
  for select using (
    exists (
      select 1 from cross_audit_instances i
      where i.id = cross_audit_findings.instance_id
    )
  );

insert into storage.buckets (id, name, public)
values
  ('source-documents', 'source-documents', false),
  ('ncr-photos', 'ncr-photos', false),
  ('ncr-evidence', 'ncr-evidence', false)
on conflict (id) do update set public = false;

drop policy if exists "ncr_photos_factory_read" on storage.objects;
create policy "ncr_photos_factory_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ncr-photos'
    and (
      public.is_global_admin()
      or (storage.foldername(name))[1] = public.current_user_factory_id()::text
    )
  );

drop policy if exists "ncr_evidence_factory_read" on storage.objects;
create policy "ncr_evidence_factory_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ncr-evidence'
    and (
      public.is_global_admin()
      or (storage.foldername(name))[1] = public.current_user_factory_id()::text
    )
  );

commit;
