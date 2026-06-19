import { createClient } from '@/lib/supabase/server'
import NcrListClient from './NcrListClient'

export default async function NcrPage() {
  const supabase = createClient()

  const { data: ncrs } = await supabase
    .from('ncrs')
    .select(`
      id, ncr_code, description, severity, status, due_date, raised_at,
      department:department_id (name),
      assignee:assigned_to (full_name),
      capa_rejection_notes
    `)
    .order('raised_at', { ascending: false })

  return <NcrListClient ncrs={(ncrs ?? []) as any} />
}
