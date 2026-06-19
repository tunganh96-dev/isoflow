import { requireManager } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import CrossAuditScopeClient from './CrossAuditScopeClient'

export default async function CrossAuditSettingsPage() {
  const user = await requireManager()
  const admin = createAdminClient()

  let factoriesQuery = admin.from('factories').select('id, name, code').order('code')
  let departmentsQuery = admin.from('departments').select('id, name, code, factory_id').order('name')
  if (user.role === 'factory_admin' && user.factory_id) {
    factoriesQuery = factoriesQuery.eq('id', user.factory_id)
    departmentsQuery = departmentsQuery.eq('factory_id', user.factory_id)
  }

  const [{ data: factories }, { data: departments }, { data: documents }, { data: scope }] = await Promise.all([
    factoriesQuery,
    departmentsQuery,
    admin
      .from('documents')
      .select('id, doc_code, title, department_id, document_assignments(department_id)')
      .in('status', ['published', 'draft', 'pending_approval', 'under_review'])
      .order('doc_code'),
    admin.from('cross_audit_process_scope').select('id, factory_id, department_id, document_id'),
  ])

  return (
    <CrossAuditScopeClient
      factories={factories ?? []}
      departments={departments ?? []}
      documents={(documents ?? []) as any[]}
      initialScope={(scope ?? []) as any[]}
    />
  )
}
