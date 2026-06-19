alter table document_resources
  add column if not exists retention_period text;
