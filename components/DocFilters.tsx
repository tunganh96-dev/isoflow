'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DocFilters({ view, showInternalViews, searchValue, typeValue, statusValue, deptValue, typeOptions, statusOptions, deptOptions, hasFilters, page, totalPages, totalItems }: {
  view: 'current' | 'updating' | 'archived' | 'resources'
  showInternalViews: boolean
  searchValue: string
  typeValue: string
  statusValue: string
  deptValue: string
  typeOptions: [string, string][]
  statusOptions: [string, string][]
  deptOptions: { id: string; name: string }[]
  hasFilters: boolean
  page: number
  totalPages: number
  totalItems: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchValue)

  function navigate(key: string, val: string) {
    const p = new URLSearchParams(window.location.search)
    if (val) p.set(key, val)
    else p.delete(key)
    if (key === 'view' && val !== 'updating') p.delete('status')
    if (key !== 'page') p.delete('page')
    const qs = p.toString()
    startTransition(() => {
      router.replace(`/documents${qs ? '?' + qs : ''}`, { scroll: false })
    })
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    navigate('q', search.trim())
  }

  const views = [
    { value: 'current', label: 'Tài liệu hiện hành' },
    { value: 'updating', label: 'Đang cập nhật' },
    { value: 'resources', label: 'Biểu mẫu & tài liệu' },
    { value: 'archived', label: 'Lưu trữ' },
  ] as const

  return (
    <div className={`border-b border-gray-200 transition-opacity ${isPending ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-4 pt-2">
        {views.filter(item => showInternalViews || ['current', 'resources'].includes(item.value)).map(item => (
          <button
            key={item.value}
            type="button"
            onClick={() => navigate('view', item.value)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              view === item.value
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={submitSearch} className="flex items-center">
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-64 rounded-l-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={view === 'resources' ? 'Tìm mã hoặc tên tài liệu...' : 'Tìm mã hoặc tên quy trình...'}
            />
            <button type="submit" className="rounded-r-lg border border-l-0 border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Tìm
            </button>
          </form>

          <select
            value={typeValue}
            onChange={e => navigate('type', e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Loại tài liệu</option>
            {typeOptions.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {view === 'updating' && (
            <select
              value={statusValue}
              onChange={e => navigate('status', e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Trạng thái cập nhật</option>
              {statusOptions.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          )}

          <select
            value={deptValue}
            onChange={e => navigate('dept', e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Bộ phận</option>
            {deptOptions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {hasFilters && (
            <Link href={`/documents?view=${view}`} className="text-xs text-gray-500 hover:text-gray-700 underline ml-1">
              Xóa lọc
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{totalItems} tài liệu</span>
          <button
            type="button"
            onClick={() => navigate('page', String(page - 1))}
            disabled={page <= 1}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <span>{page}/{totalPages}</span>
          <button
            type="button"
            onClick={() => navigate('page', String(page + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tiếp
          </button>
        </div>
      </div>
    </div>
  )
}
