alter table documents
  add column if not exists flowchart_image_path text,
  add column if not exists flowchart_image_mime text;
