import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth'
import DepartmentList from './DepartmentList'

export default async function DepartmentsSettingsPage() {
  await requireManager()
  const supabase = createClient()

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, code, factory_id, exclude_from_cross_audit, factories:factory_id (name)')
    .order('name') as { data: any[] | null }

  return (
    <DepartmentList
      departments={departments ?? []}
    />
  )
}
