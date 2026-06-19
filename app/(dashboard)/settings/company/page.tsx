import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth'
import FactoryList from './FactoryList'

export default async function CompanySettingsPage() {
  await requireManager()
  const supabase = createClient()

  const { data: factories } = await supabase
    .from('factories')
    .select('id, name, code, created_at')
    .order('name')

  return <FactoryList factories={factories ?? []} />
}
