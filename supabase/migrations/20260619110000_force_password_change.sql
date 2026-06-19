-- Add password change tracking to users table
-- password_changed_at: null means never changed (first login requires change)
-- force_password_change: admin can set this to force a user to change password

begin;

alter table users add column if not exists password_changed_at timestamptz;
alter table users add column if not exists force_password_change boolean not null default true;

-- Existing users: mark as already changed so they're not forced immediately
-- New users created after this migration will have force_password_change = true by default
update users set password_changed_at = created_at, force_password_change = false;

commit;
