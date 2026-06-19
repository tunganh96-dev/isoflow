begin;

alter table users drop constraint if exists users_role_check;

update users
set role = case role
  when 'qa_manager' then 'super_admin'
  when 'qa_employee' then 'department_head'
  when 'staff' then 'employee'
  else role
end;

alter table users add constraint users_role_check
  check (role in ('super_admin','coo','factory_admin','department_head','employee'));

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

drop policy if exists "users_read" on users;
create policy "users_read" on users
  for select using (
    id = auth.uid()
    or public.is_admin_user()
  );

drop policy if exists "documents_read" on documents;
create policy "documents_read" on documents
  for select using (
    public.is_admin_user()
    or factory_id is null
    or factory_id = (select factory_id from users where id = auth.uid())
  );

drop policy if exists "documents_insert" on documents;
create policy "documents_insert" on documents
  for insert with check (
    public.can_create_quality_record()
  );

drop policy if exists "documents_update" on documents;
create policy "documents_update" on documents
  for update using (
    public.is_admin_user()
    or (
      owner_id = auth.uid()
      and status = 'draft'
    )
  );

drop policy if exists "doc_assignments_insert" on document_assignments;
create policy "doc_assignments_insert" on document_assignments
  for insert with check (
    public.is_admin_user()
  );

drop policy if exists "ncrs_read" on ncrs;
create policy "ncrs_read" on ncrs
  for select using (
    public.is_admin_user()
    or factory_id = (select factory_id from users where id = auth.uid())
  );

drop policy if exists "ncrs_insert" on ncrs;
create policy "ncrs_insert" on ncrs
  for insert with check (
    public.can_create_quality_record()
  );

drop policy if exists "ncrs_update" on ncrs;
create policy "ncrs_update" on ncrs
  for update using (
    public.is_admin_user()
    or factory_id = (select factory_id from users where id = auth.uid())
  );

drop policy if exists "ncr_activity_read" on ncr_activity;
create policy "ncr_activity_read" on ncr_activity
  for select using (
    exists (
      select 1 from ncrs n
      join users u on u.id = auth.uid()
      where n.id = ncr_id
      and (u.role in ('super_admin','coo','factory_admin') or n.factory_id = u.factory_id)
    )
  );

commit;
