-- Remove work_area references from users and job_positions, then drop the table

ALTER TABLE users DROP COLUMN IF EXISTS work_area_id;
ALTER TABLE job_positions DROP COLUMN IF EXISTS work_area_id;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'work_areas') THEN
    DROP POLICY IF EXISTS "work_areas_read" ON work_areas;
    DROP POLICY IF EXISTS "work_areas_manage" ON work_areas;
    DROP TABLE work_areas;
  END IF;
END $$;
