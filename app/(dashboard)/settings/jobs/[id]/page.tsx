import { notFound } from 'next/navigation'
import { requireManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { normalizeLearningAssets } from '@/lib/learning-assets'
import JobDetailClient from './JobDetailClient'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  await requireManager()
  const supabase = createClient()

  const { data: job } = await supabase
    .from('job_positions')
    .select('id, title, role_type, department_id, department:department_id(name)')
    .eq('id', params.id)
    .single()
  if (!job) notFound()

  const [{ data: documents }, { data: selected }, { data: users }, { data: plans }] = await Promise.all([
    supabase
      .from('documents')
      .select(`
        id, doc_code, title, status, process_importance_level, department_id,
        document_assignments (department_id),
        learning:document_learning_assets (
          worker_verification, manager_confirmation, cross_audit_frequency, audit_checklist
        )
      `)
      .eq('status', 'published')
      .order('doc_code'),
    supabase.from('job_position_processes').select('document_id').eq('job_position_id', params.id),
    supabase.from('users').select('id, full_name, email').eq('job_position_id', params.id).order('full_name'),
    supabase.from('job_monthly_checklist_plans').select('id, month, status, plan, generated_at').eq('job_position_id', params.id).order('month', { ascending: false }).limit(3),
  ])

  const relatedDocuments = (documents ?? []).filter((doc: any) => (
    doc.department_id === job.department_id
    || (doc.document_assignments ?? []).some((assignment: any) => assignment.department_id === job.department_id)
  ))

  const enriched = relatedDocuments.map((doc: any) => {
    const assets = normalizeLearningAssets(Array.isArray(doc.learning) ? doc.learning[0] : doc.learning)
    return {
      id: doc.id,
      doc_code: doc.doc_code,
      title: doc.title,
      status: doc.status,
      process_importance_level: doc.process_importance_level ?? 3,
      worker_frequency: assets.worker_verification.frequency,
      worker_questions: assets.worker_verification.items.length,
      manager_frequency: assets.manager_confirmation.frequency,
      manager_questions: assets.manager_confirmation.items.length,
      cross_audit_frequency: assets.cross_audit_frequency,
      audit_questions: assets.audit_checklist.length,
    }
  })

  return (
    <div>
      <JobDetailClient
        jobId={params.id}
        initialTitle={job.title}
        roleType={job.role_type}
        subtitle={`${(job.department as any)?.name ?? '—'} · ${job.role_type}`}
        documents={enriched}
        selectedDocumentIds={(selected ?? []).map(item => item.document_id)}
        users={users ?? []}
        plans={(plans ?? []) as any}
      />
    </div>
  )
}
