delete from document_assignments
where department_id is null;

drop policy if exists "documents_read" on documents;
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

drop policy if exists "doc_assignments_delete" on document_assignments;
create policy "doc_assignments_delete" on document_assignments
  for delete using (public.can_create_quality_record());
