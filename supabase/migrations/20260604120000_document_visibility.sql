drop policy if exists "documents_read" on documents;
create policy "documents_read" on documents
  for select using (
    public.is_admin_user()
    or (
      status = 'published'
      and (
        factory_id is null
        or factory_id = (select factory_id from users where id = auth.uid())
      )
    )
    or owner_id = auth.uid()
    or (
      exists (
        select 1
        from document_assignments da
        join users u on u.id = auth.uid()
        where da.document_id = documents.id
          and u.role = 'department_head'
          and da.department_id = u.department_id
      )
    )
  );

drop policy if exists "documents_update" on documents;
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
  );

drop policy if exists "doc_assignments_insert" on document_assignments;
create policy "doc_assignments_insert" on document_assignments
  for insert with check (public.can_create_quality_record());
