alter table document_learning_assets
  add column if not exists cross_audit_frequency text not null default 'monthly'
  check (cross_audit_frequency in ('none', 'monthly', 'quarterly'));
