import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS, DOC_STATUS_COLORS } from '@/lib/documents'

const DOC_TYPES = Object.entries(DOC_TYPE_LABELS)
const STATUSES = Object.entries(DOC_STATUS_LABELS)

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string; factory?: string }
}) {
  const user = await getCurrentUser()
  const supabase = createClient()

  // Fetch factories for filter dropdown
  const { data: factories } = await supabase.from('factories').select('id, name, code').order('name')

  // Build query
  let query = supabase
    .from('documents')
    .select(`
      id, doc_code, title, doc_type, status, version, updated_at, is_addendum,
      factories:factory_id (name, code),
      owner:owner_id (full_name)
    `)
    .not('status', 'eq', 'archived')
    .order('updated_at', { ascending: false })

  if (searchParams.type) query = query.eq('doc_type', searchParams.type)
  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.factory) query = query.eq('factory_id', searchParams.factory)

  const { data: documents } = await query

  function buildUrl(key: string, val: string) {
    const p = new URLSearchParams(searchParams as Record<string, string>)
    if (p.get(key) === val) p.delete(key)
    else p.set(key, val)
    return `/documents?${p.toString()}`
  }

  const canCreate = ['qa_employee', 'qa_manager'].includes(user.role)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Tài liệu</h1>
        {canCreate && (
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Tạo tài liệu mới
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          {DOC_TYPES.map(([val, label]) => (
            <Link
              key={val}
              href={buildUrl('type', val)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                searchParams.type === val
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1">
          {STATUSES.filter(([v]) => v !== 'archived').map(([val, label]) => (
            <Link
              key={val}
              href={buildUrl('status', val)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                searchParams.status === val
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Clear filters */}
        {(searchParams.type || searchParams.status || searchParams.factory) && (
          <Link href="/documents" className="px-2.5 py-1 rounded-full text-xs text-gray-500 hover:text-gray-700 underline">
            Xóa bộ lọc
          </Link>
        )}
      </div>

      {/* Document list */}
      {!documents?.length ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Không có tài liệu nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-gray-400">{doc.doc_code}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>
                    {DOC_STATUS_LABELS[doc.status]}
                  </span>
                  {doc.is_addendum && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">Phụ lục</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{doc.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>{DOC_TYPE_LABELS[doc.doc_type]}</span>
                  <span>v{doc.version}</span>
                  {doc.factories?.name && <span>{doc.factories.name}</span>}
                  <span>{doc.owner?.full_name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
