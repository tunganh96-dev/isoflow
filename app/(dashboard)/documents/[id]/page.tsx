import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS, DOC_STATUS_COLORS, FLOWCHART_TYPES } from '@/lib/documents'
import { normalizeLearningAssets } from '@/lib/learning-assets'
import { canApproveQualityRecord, canWorkOnDocument } from '@/lib/roles'
import Link from 'next/link'
import { ChevronLeft, Clock, User, Building2, Download, FileText } from 'lucide-react'
import dynamic from 'next/dynamic'
import DocActions from './DocActions'
import DocumentViewer from '@/components/DocumentViewer'
import DocumentLearningPanel from '@/components/DocumentLearningPanel'

const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const supabase = createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select(`
      *,
      factory:factory_id (id, name, code),
      department:department_id (id, name),
      owner:owner_id (id, full_name),
      approver:approved_by (full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!doc) notFound()

  const baseCode = doc.doc_code.replace(/-v\d+$/, '')
  const [
    { data: historyRows },
    { data: assignments },
    { data: learningAssetRow },
    { data: readConfirmation },
    { data: resourceLinks },
  ] = await Promise.all([
    supabase
      .from('documents')
      .select('id, doc_code, version, status, approved_at, created_at, revision_type, revision_summary, owner:owner_id(full_name)')
      .like('doc_code', `${baseCode}%`)
      .order('version', { ascending: false }),
    supabase
      .from('document_assignments')
      .select('department:department_id (id, name)')
      .eq('document_id', params.id)
      .order('assigned_at', { ascending: false }),
    supabase
      .from('document_learning_assets')
      .select('summary_card, quiz, worker_verification, manager_confirmation, cross_audit_frequency, audit_checklist')
      .eq('document_id', params.id)
      .maybeSingle(),
    supabase
      .from('document_read_confirmations')
      .select('passed')
      .eq('document_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('document_resource_links')
      .select('resource:resource_id(id, resource_code, name, description, resource_type, retention_period, file_name, department:department_id(name))')
      .eq('document_id', params.id)
      .order('linked_at'),
  ])

  const history = historyRows?.filter(item => (
    item.doc_code === baseCode || item.doc_code.match(new RegExp(`^${escapeRegExp(baseCode)}-v\\d+$`))
  ))

  const assignedDepartments = (assignments ?? [])
    .map((assignment: any) => assignment.department?.name)
    .filter(Boolean)
  const mainDepartmentName = (doc.department as any)?.name ?? '—'
  const canEdit = canWorkOnDocument({
    role: user.role,
    userId: user.id,
    userDepartmentId: user.department_id,
    ownerId: doc.owner_id,
    assignedDepartmentIds: (assignments ?? [])
      .map((assignment: any) => assignment.department?.id)
      .filter(Boolean),
  })
  const learningAssets = learningAssetRow ? normalizeLearningAssets(learningAssetRow) : null
  const canViewInternalLearning = canApproveQualityRecord(user.role) || doc.owner_id === user.id

  const showFlowchart = FLOWCHART_TYPES.includes(doc.doc_type) && doc.mermaid_code

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <Link href="/documents" className="text-gray-400 hover:text-gray-600 mt-0.5">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-gray-400">{doc.doc_code}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>
              {DOC_STATUS_LABELS[doc.status]}
            </span>
            <span className="text-xs text-gray-400">v{doc.version}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{DOC_TYPE_LABELS[doc.doc_type]}</p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <User size={14} />
                {(doc.owner as any)?.full_name ?? '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 size={14} />
                Bộ phận chính: {mainDepartmentName}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 size={14} />
                Bắt buộc học: {assignedDepartments.length ? assignedDepartments.join(', ') : 'Chưa cấu hình'}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {new Date(doc.updated_at).toLocaleDateString('vi-VN')}
              </span>
              {doc.approver && (
                <span className="text-green-600">
                  ✓ Phê duyệt bởi {(doc.approver as any).full_name}
                </span>
              )}
            </div>
            <DocActions doc={doc} user={user} canEdit={canEdit} />
          </div>
        </section>

        <DocumentLearningPanel
          documentId={doc.id}
          assets={learningAssets}
          canViewInternal={canViewInternalLearning}
          initialPassed={Boolean(readConfirmation?.passed)}
        />

        <section className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Biểu mẫu & tài liệu liên quan</h2>
            </div>
            {doc.source_file_url ? (
              <a
                href={`/api/documents/${doc.id}/source-file`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span>File gốc đã upload</span>
                <Download size={15} className="text-gray-400" />
              </a>
            ) : (
              <p className="text-xs text-gray-400">Không có file nguồn.</p>
            )}
          </div>
          {resourceLinks?.length ? (
            <div className="divide-y divide-gray-100">
              {resourceLinks.map((link: any) => (
                <div key={link.resource?.id} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      <span className="mr-2 font-mono text-xs text-blue-700">{link.resource?.resource_code}</span>
                      {link.resource?.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{link.resource?.description}</p>
                  </div>
                  <a
                    href={`/api/document-resources/${link.resource?.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Download size={14} /> Tải file
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-sm text-gray-500">Chưa liên kết biểu mẫu hoặc tài liệu hỗ trợ.</p>
          )}
        </section>

        <DocumentViewer content={doc.content} flowchartImageUrl={doc.flowchart_image_path ? `/api/documents/${doc.id}/flowchart-image` : null} />

        {showFlowchart && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Sơ đồ quy trình</h3>
            <MermaidChart code={doc.mermaid_code} />
          </div>
        )}

        {history && history.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Lịch sử thay đổi</h3>
            <div className="divide-y divide-gray-100">
              {history.map((h: any) => (
                <Link
                  key={h.id}
                  href={`/documents/${h.id}`}
                  className="grid gap-2 px-2 py-3 text-sm hover:bg-gray-50 md:grid-cols-[110px_150px_minmax(0,1fr)_180px] md:items-start"
                >
                  <span className="font-semibold text-gray-900">
                    v{h.version}
                    {h.id === doc.id && <span className="ml-2 text-xs font-normal text-blue-600">Đang xem</span>}
                  </span>
                  <span className="text-gray-500">
                    {h.revision_type === 'major' ? 'Thay đổi lớn' : h.revision_type === 'minor' ? 'Thay đổi nhỏ' : 'Ban hành lần đầu'}
                  </span>
                  <span className="text-gray-700">
                    {h.revision_summary || (h.version === 1 ? 'Ban hành tài liệu lần đầu.' : 'Chưa ghi nội dung thay đổi.')}
                  </span>
                  <span className="text-gray-400 md:text-right">
                    {(h.owner as any)?.full_name ?? '—'} · {new Date(h.approved_at ?? h.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
