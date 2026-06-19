alter table documents
  add column if not exists revision_summary text,
  add column if not exists previous_version_id uuid references documents(id);

alter table documents
  drop constraint if exists documents_doc_code_key;

create index if not exists idx_documents_previous_version_id
  on documents (previous_version_id);

create unique index if not exists idx_documents_doc_code_version_unique
  on documents (doc_code, version);
