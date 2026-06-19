import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { Plus, FileText, Upload } from 'lucide-react'
import { DOC_TYPE_LABELS, DOC_STATUS_LABELS, DOC_STATUS_COLORS } from '@/lib/documents'
import DocFilters from '@/components/DocFilters'
import ResourceLibrary from '@/components/ResourceLibrary'
import { canCreateQualityRecord } from '@/lib/roles'

const DOC_TYPES = Object.entries(DOC_TYPE_LABELS) as [string, string][]
const UPDATE_STATUSES = (Object.entries(DOC_STATUS_LABELS) as [string, string][])
  .filter(([value]) => ['draft', 'pending_approval', 'under_review'].includes(value))
const RESOURCE_TYPES: [string, string][] = [
  ['form', 'Biểu mẫu'],
  ['record', 'Hồ sơ'],
  ['reference', 'Tài liệu tham khảo'],
  ['other', 'Khác'],
]
const PAGE_SIZE = 50

type DocumentView = 'current' | 'updating' | 'archived' | 'resources'

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: { view?: string; type?: string; status?: string; dept?: string; page?: string; q?: string; action?: string }
}) {
  const user = await getCurrentUser()
  const supabase = createClient()
  const view: DocumentView = ['updating', 'archived', 'resources'].includes(searchParams.view ?? '')
    ? searchParams.view as DocumentView
    : 'current'
  const canCreate = canCreateQualityRecord(user.role)
  const search = (searchParams.q ?? '').trim().replace(/[,%()"]/g, '')

  const departmentsPromise = supabase
    .from('departments')
    .select('id, name')
    .order('name')

  if (view === 'resources') {
    const requestedPage = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1)
    let resourcesQuery = supabase
      .from('document_resources')
      .select('id, resource_code, name, description, resource_type, department_id, department:department_id(id, name), retention_period, file_name, mime_type, file_size, created_at, uploader:uploaded_by(full_name)', { count: 'exact' })
      .order('resource_code')
    if (search) resourcesQuery = resourcesQuery.or(`resource_code.ilike.%${search}%,name.ilike.%${search}%`)
    if (searchParams.type) resourcesQuery = resourcesQuery.eq('resource_type', searchParams.type)
    if (searchParams.dept) resourcesQuery = resourcesQuery.eq('department_id', searchParams.dept)

    const from = (requestedPage - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const [{ data: departments }, { data: resources, count }] = await Promise.all([
      departmentsPromise,
      resourcesQuery.range(from, to),
    ])
    const totalItems = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
    const page = Math.min(requestedPage, totalPages)

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Tài liệu</h1>
          {canCreate && (
            <Link href="/documents?view=resources&action=upload" className="btn-primary min-h-0 px-3 py-2 text-sm">
              <Upload size={16} /> Tải file lên
            </Link>
          )}
        </div>
        <div className="min-h-[calc(100dvh-9rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
          <DocFilters
            view={view}
            showInternalViews={canCreate}
            searchValue={searchParams.q ?? ''}
            typeValue={searchParams.type ?? ''}
            statusValue=""
            deptValue={searchParams.dept ?? ''}
            typeOptions={RESOURCE_TYPES}
            statusOptions={UPDATE_STATUSES}
            deptOptions={departments ?? []}
            hasFilters={Boolean(search || searchParams.type || searchParams.dept)}
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
          />
          <ResourceLibrary resources={(resources ?? []) as any} initialShowUpload={searchParams.action === 'upload'} />
        </div>
      </div>
    )
  }

  const requestedPage = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1)
  let query = supabase
    .from('documents')
    .select(`
      id, doc_code, title, doc_type, status, version, updated_at, approved_at, is_addendum,
      previous_version_id, revision_type, revision_summary,
      department:department_id (id, name),
      owner:owner_id (full_name),
      document_assignments (
        department:department_id (id, name)
      )
    `, { count: 'exact' })
    .order('updated_at', { ascending: false })

  if (view === 'current') query = query.eq('status', 'published')
  if (view === 'updating') {
    query = searchParams.status
      ? query.eq('status', searchParams.status)
      : query.in('status', ['draft', 'pending_approval', 'under_review'])
  }
  if (view === 'archived') query = query.eq('status', 'archived')

  if (searchParams.type) query = query.eq('doc_type', searchParams.type)
  if (searchParams.dept) query = query.eq('department_id', searchParams.dept)
  if (search) query = query.or(`doc_code.ilike.%${search}%,title.ilike.%${search}%`)

  const from = (requestedPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const [
    { data: departments },
    { data: documents, count },
  ] = await Promise.all([
    departmentsPromise,
    query.range(from, to),
  ])
  const totalItems = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)

  let updatesByPreviousId = new Map<string, any>()
  if (view === 'current' && documents?.length) {
    const { data: updates } = await supabase
      .from('documents')
      .select('id, previous_version_id, version, status')
      .in('previous_version_id', documents.map(doc => doc.id))
      .in('status', ['draft', 'pending_approval', 'under_review'])

    updatesByPreviousId = new Map((updates ?? []).map(update => [update.previous_version_id, update]))
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Tài liệu</h1>
        {canCreate && (
          <Link href="/documents/new" className="btn-primary min-h-0 px-3 py-2 text-sm">
            <Plus size={16} /> Tạo tài liệu mới
          </Link>
        )}
      </div>

      <div className="min-h-[calc(100dvh-9rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
        <DocFilters
          view={view}
          showInternalViews={canCreate}
          searchValue={searchParams.q ?? ''}
          typeValue={searchParams.type ?? ''}
          statusValue={searchParams.status ?? ''}
          deptValue={searchParams.dept ?? ''}
          typeOptions={DOC_TYPES}
          statusOptions={UPDATE_STATUSES}
          deptOptions={departments ?? []}
          hasFilters={!!(searchParams.q || searchParams.type || searchParams.status || searchParams.dept)}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
        />

        {!documents?.length ? (
          <div className="flex min-h-[calc(100dvh-18rem)] flex-col items-center justify-center text-gray-400">
            <FileText size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{emptyLabel(view)}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Mã</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Tên tài liệu</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Loại</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Bộ phận</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Ngày xuất bản</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc: any) => {
                    const update = updatesByPreviousId.get(doc.id)
                    return (
                      <tr key={doc.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 align-top">
                          <Link href={`/documents/${doc.id}`} className="font-mono text-xs font-medium text-blue-600 hover:underline">
                            {doc.doc_code}
                          </Link>
                          <p className="mt-1 text-xs text-gray-400">v{doc.version}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Link href={`/documents/${doc.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {doc.title}
                          </Link>
                          {(doc.owner as any)?.full_name && <p className="mt-1 text-xs text-gray-400">{(doc.owner as any).full_name}</p>}
                        </td>
                        <td className="px-4 py-3 align-top text-gray-600">
                          {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                          {doc.is_addendum && <p className="mt-1 text-xs text-purple-600">Phụ lục</p>}
                        </td>
                        <td className="px-4 py-3 align-top text-gray-600">{getDepartmentNames(doc)}</td>
                        <td className="px-4 py-3 align-top text-gray-600">{formatDate(doc.approved_at)}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>
                              {DOC_STATUS_LABELS[doc.status]}
                            </span>
                            {view === 'current' && update && (
                              <Link
                                href={`/documents/${update.id}`}
                                className="block text-xs font-medium text-blue-700 hover:underline"
                              >
                                v{update.version} · {DOC_STATUS_LABELS[update.status]}
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {documents.map((doc: any) => {
                const update = updatesByPreviousId.get(doc.id)
                return (
                  <div key={doc.id} className="px-4 py-3">
                    <Link href={`/documents/${doc.id}`} className="block">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="font-mono text-xs font-medium text-blue-600">{doc.doc_code}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>
                          {DOC_STATUS_LABELS[doc.status]}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        v{doc.version} · {DOC_TYPE_LABELS[doc.doc_type]} · {getDepartmentNames(doc)} · XB {formatDate(doc.approved_at)}
                      </p>
                    </Link>
                    {view === 'current' && update && (
                      <Link
                        href={`/documents/${update.id}`}
                        className="mt-2 inline-flex rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                      >
                        Cập nhật v{update.version} · {DOC_STATUS_LABELS[update.status]}
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function getDepartmentNames(doc: any) {
  if (doc.department?.name) return doc.department.name

  const names: string[] = (doc.document_assignments ?? [])
    .map((assignment: any) => assignment.department?.name)
    .filter((name: unknown): name is string => typeof name === 'string' && Boolean(name))

  return names.length ? Array.from(new Set(names)).join(', ') : '—'
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '—'
}

function emptyLabel(view: DocumentView) {
  if (view === 'updating') return 'Không có tài liệu nào đang cập nhật'
  if (view === 'archived') return 'Không có phiên bản lưu trữ'
  return 'Không có tài liệu hiện hành'
}
