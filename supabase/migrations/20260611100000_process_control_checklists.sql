alter table document_learning_assets
  add column if not exists worker_verification jsonb not null default '{}'::jsonb,
  add column if not exists manager_confirmation jsonb not null default '{}'::jsonb;
