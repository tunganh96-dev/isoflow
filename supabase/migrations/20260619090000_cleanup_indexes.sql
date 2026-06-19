create index if not exists idx_departments_factory_id
  on departments (factory_id);

create index if not exists idx_users_factory_id
  on users (factory_id);

create index if not exists idx_users_department_id
  on users (department_id);

create index if not exists idx_users_job_position_id
  on users (job_position_id);

create index if not exists idx_documents_factory_status
  on documents (factory_id, status);

create index if not exists idx_documents_department_id
  on documents (department_id);

create index if not exists idx_documents_owner_id
  on documents (owner_id);

create index if not exists idx_documents_previous_version_id
  on documents (previous_version_id);

create index if not exists idx_document_assignments_factory_id
  on document_assignments (factory_id);

create index if not exists idx_ncrs_factory_status
  on ncrs (factory_id, status);

create index if not exists idx_ncrs_department_id
  on ncrs (department_id);

create index if not exists idx_ncrs_assigned_to
  on ncrs (assigned_to);

create index if not exists idx_ncrs_open_due_date
  on ncrs (due_date)
  where status <> 'completed';

create index if not exists idx_document_read_confirmations_user_id
  on document_read_confirmations (user_id);

create index if not exists idx_document_resource_links_document_id
  on document_resource_links (document_id);
