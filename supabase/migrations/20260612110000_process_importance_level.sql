alter table documents
  add column if not exists process_importance_level integer not null default 3
  check (process_importance_level between 1 and 5);

update documents
set process_importance_level = case process_importance
  when 'high' then 5
  when 'low' then 2
  else 3
end
where process_importance_level = 3;
