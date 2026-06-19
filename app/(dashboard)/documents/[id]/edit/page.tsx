import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { normalizeLearningAssets } from '@/lib/learning-assets'
import { canWorkOnDocument } from '@/lib/roles'
import DocumentEditClient from './DocumentEditClient'

export default async function EditDocumentPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const supabase = createClient()

  const [
    { data: document },
    { data: learningAssetRow },
    { data: assignments },
    { data: resourceLinks },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from('documents')
      .select('id, title, content, mermaid_code, doc_type, doc_code, department_id, process_importance, process_importance_level, flowchart_image_path, flowchart_image_mime, status, owner_id')
      .eq('id', params.id)
      .single(),
    supabase
      .from('document_learning_assets')
      .select('summary_card, quiz, worker_verification, manager_confirmation, cross_audit_frequency, audit_checklist')
      .eq('document_id', params.id)
      .maybeSingle(),
    supabase.from('document_assignments').select('department_id').eq('document_id', params.id),
    supabase.from('document_resource_links').select('resource_id').eq('document_id', params.id),
    supabase.from('departments').select('id, name').order('name'),
  ])

  if (!document) notFound()
  if (document.status !== 'draft') redirect(`/documents/${params.id}`)

  const canEdit = canWorkOnDocument({
    role: user.role,
    userId: user.id,
    userDepartmentId: user.department_id,
    ownerId: document.owner_id,
    assignedDepartmentIds: (assignments ?? []).map(item => item.department_id).filter(Boolean),
  })
  if (!canEdit) redirect(`/documents/${params.id}`)

  return (
    <DocumentEditClient
      document={document}
      initialLearningAssets={learningAssetRow ? normalizeLearningAssets(learningAssetRow) : null}
      initialResourceIds={(resourceLinks ?? []).map(link => link.resource_id)}
      initialDepartmentIds={(assignments ?? []).map(assignment => assignment.department_id).filter(Boolean)}
      departments={departments ?? []}
    />
  )
}
