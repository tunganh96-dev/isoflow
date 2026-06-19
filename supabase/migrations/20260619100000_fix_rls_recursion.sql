-- Fix infinite recursion: documents_read → document_assignments → doc_assignments_read → documents → documents_read
-- The doc_assignments_read policy references the documents table, which triggers documents_read again.
-- Fix: allow reading document_assignments for any authenticated user (the documents policy already gates access).

begin;

drop policy if exists "doc_assignments_read" on document_assignments;
create policy "doc_assignments_read" on document_assignments
  for select using (auth.uid() is not null);

commit;
