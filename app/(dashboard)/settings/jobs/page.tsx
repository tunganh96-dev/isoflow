import { requireManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import JobsClient from './JobsClient'

export default async function JobsSettingsPage() {
  await requireManager()
  const supabase = createClient()

  const [{ data: departments }, { data: jobs }] = await Promise.all([
    supabase.from('departments').select('id, name, factory_id').order('name'),
    supabase.from('job_positions').select('id, title, role_type, department_id, department:department_id(name), users:users(id)').order('title'),
  ])

  return (
    <JobsClient
      departments={departments ?? []}
      jobs={(jobs ?? []) as any}
    />
  )
}
