alter table documents
  add column if not exists department_id uuid references departments(id);

create index if not exists idx_documents_department_id
  on documents (department_id);
