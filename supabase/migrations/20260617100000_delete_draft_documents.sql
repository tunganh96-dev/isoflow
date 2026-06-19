drop policy if exists "documents_delete_draft" on documents;
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
