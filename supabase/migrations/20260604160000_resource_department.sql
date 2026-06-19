alter table document_resources
  add column if not exists department_id uuid references departments(id);

create index if not exists idx_document_resources_department_id
  on document_resources (department_id);
