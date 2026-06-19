import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth'
import UserList from './UserList'

export default async function UsersSettingsPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const q = searchParams?.q
  await requireManager()
  const supabase = createClient()

  let usersQuery: any = supabase
    .from('users')
    .select(`
      id, full_name, email, role, created_at,
      factories:factory_id (id, name),
      departments:department_id (id, name),
      job_position:job_position_id (id, title)
    `)
    .order('full_name')

  if (q?.trim()) {
    usersQuery = supabase
      .from('users')
      .select(`
        id, full_name, email, role, created_at,
        factories:factory_id (id, name),
        departments:department_id (id, name),
        job_position:job_position_id (id, title)
      `)
      .or(`full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%,role.ilike.%${q.trim()}%`)
      .order('full_name')
  }

  const { data: users } = await usersQuery

  const { data: factories } = await supabase
    .from('factories')
    .select('id, name, code')
    .order('name')

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, factory_id')
    .order('name')

  const { data: jobPositions } = await supabase.from('job_positions').select('id, title, department_id').order('title')

  return (
    <UserList
      users={users ?? []}
      factories={factories ?? []}
      departments={departments ?? []}
      jobPositions={jobPositions ?? []}
      query={q ?? ''}
    />
  )
}
