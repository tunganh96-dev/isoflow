import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import CrossAuditClient from './CrossAuditClient'

export default async function CrossAuditPage() {
  const user = await getCurrentUser()
  const supabase = createClient()

  const { data: factories } = await supabase
    .from('factories')
    .select('id, name, code')
    .order('code')

  return <CrossAuditClient user={user} factories={factories ?? []} />
}
