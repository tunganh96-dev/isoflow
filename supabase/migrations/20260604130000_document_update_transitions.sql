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
