create index if not exists idx_documents_status_updated_at
  on documents (status, updated_at desc);

create index if not exists idx_documents_doc_code_version
  on documents (doc_code, version desc);

create index if not exists idx_document_assignments_document_id
  on document_assignments (document_id);

create index if not exists idx_document_assignments_department_id
  on document_assignments (department_id);

create index if not exists idx_notifications_user_created_at
  on notifications (user_id, created_at desc);

create index if not exists idx_ncrs_status_raised_at
  on ncrs (status, raised_at desc);

create index if not exists idx_ncr_activity_ncr_created_at
  on ncr_activity (ncr_id, created_at desc);
