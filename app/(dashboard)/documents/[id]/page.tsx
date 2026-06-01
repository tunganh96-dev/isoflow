import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS, DOC_STATUS_COLORS, FLOWCHART_TYPES } from '@/lib/documents'
import Link from 'next/link'
import { ChevronLeft, Clock, User, Building2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import DocActions from './DocActions'

const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const supabase = createClient()

  const { data: doc } = await supabase
    .from('documents')
    .select(`
      *,
      factory:factory_id (id, name, code),
      owner:owner_id (id, full_name),
      approver:approved_by (full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!doc) notFound()

  // Fetch version history (archived versions of same base code)
  const baseCode = doc.doc_code.replace(/-v\d+$/, '')
  const { data: history } = await supabase
    .from('documents')
    .select('id, doc_code, version, status, approved_at')
    .like('doc_code', `${baseCode}-v%`)
    .order('version', { ascending: false })

  const { data: factories } = await supabase.from('factories').select('id, name')

  const showFlowchart = FLOWCHART_TYPES.includes(doc.doc_type) && doc.mermaid_code

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
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

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <User size={14} />
          {(doc.owner as any)?.full_name ?? '—'}
        </span>
        {doc.factory && (
          <span className="flex items-center gap-1.5">
            <Building2 size={14} />
            {(doc.factory as any).name}
          </span>
        )}
        {!doc.factory && (
          <span className="flex items-center gap-1.5">
            <Building2 size={14} />
            Tài liệu gốc (tất cả nhà máy)
          </span>
        )}
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

      {/* Actions (client component) */}
      <DocActions doc={doc} user={user} factories={factories ?? []} />

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
        />
      </div>

      {/* Mermaid flowchart */}
      {showFlowchart && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sơ đồ quy trình</h3>
          <MermaidChart code={doc.mermaid_code} />
        </div>
      )}

      {/* Version history */}
      {history && history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lịch sử phiên bản</h3>
          <div className="space-y-1">
            {history.map((h: any) => (
              <Link
                key={h.id}
                href={`/documents/${h.id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 text-sm"
              >
                <span className="font-mono text-gray-500">{h.doc_code}</span>
                <span className="text-gray-400">v{h.version} · {h.approved_at ? new Date(h.approved_at).toLocaleDateString('vi-VN') : '—'}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Minimal markdown → HTML (avoids a heavy parser dependency for display)
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n{2,}/g, '</p><p class="mb-2">')
    .replace(/^(?!<[hlp]|<li)(.+)$/gm, '<p class="mb-2">$1</p>')
}
