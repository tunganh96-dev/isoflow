'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, List, Columns3 } from 'lucide-react'
import {
  NCR_COLUMNS,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  isOverdue,
  daysUntilDue,
} from '@/lib/ncr'

interface Ncr {
  id: string
  ncr_code: string
  description: string
  severity: string
  status: string
  due_date: string | null
  raised_at: string
  department: { name: string } | null
  assignee: { full_name: string } | null
  capa_rejection_notes: string | null
}

export default function NcrListClient({ ncrs }: { ncrs: Ncr[] }) {
  const [view, setView] = useState<'list' | 'kanban'>('list')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Vấn đề</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={15} /> Danh sách
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border-l border-gray-200 transition-colors ${
                view === 'kanban' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Columns3 size={15} /> Kanban
            </button>
          </div>
          <Link href="/ncr/new" className="btn-primary text-sm px-3 py-2 min-h-0">
            <Plus size={16} /> Tạo vấn đề mới
          </Link>
        </div>
      </div>

      {view === 'list' ? <ListView ncrs={ncrs} /> : <KanbanView ncrs={ncrs} />}
    </div>
  )
}

/* ── List View (default) ── */
function ListView({ ncrs }: { ncrs: Ncr[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Mã vấn đề</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Mô tả</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Bộ phận</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Mức độ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Trạng thái</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Người xử lý</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Hạn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ncrs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  Chưa có vấn đề nào
                </td>
              </tr>
            )}
            {ncrs.map((ncr) => {
              const days = daysUntilDue(ncr.due_date)
              const overdue = isOverdue(ncr.due_date) && ncr.status !== 'completed'
              return (
                <tr key={ncr.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/ncr/${ncr.id}`} className="font-mono text-sm text-blue-600 hover:underline">
                      {ncr.ncr_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <Link href={`/ncr/${ncr.id}`} className="text-gray-800 hover:text-blue-600 line-clamp-1">
                      {ncr.description}
                    </Link>
                    {ncr.capa_rejection_notes && ncr.status === 'analysing' && (
                      <span className="ml-2 text-xs text-red-600">Bị từ chối</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{ncr.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[ncr.severity]}`}>
                      {SEVERITY_LABELS[ncr.severity]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ncr.status]}`}>
                      {STATUS_LABELS[ncr.status] ?? ncr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{ncr.assignee?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ncr.due_date ? (
                      <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : days !== null && days <= 3 ? 'text-orange-500' : 'text-gray-500'}`}>
                        {overdue
                          ? `Quá hạn ${Math.abs(days!)} ngày`
                          : days === 0
                          ? 'Hôm nay'
                          : `${days} ngày`}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Kanban View ── */
function KanbanView({ ncrs }: { ncrs: Ncr[] }) {
  const grouped = Object.fromEntries(
    NCR_COLUMNS.map(col => [col.status, ncrs.filter(n => n.status === col.status)])
  )

  return (
    <div className="overflow-x-auto kanban-scroll-x pb-4">
      <div className="flex gap-3" style={{ minHeight: '60vh' }}>
        {NCR_COLUMNS.map(col => {
          const cards = grouped[col.status] ?? []
          return (
            <div key={col.status} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-t-2 bg-gray-50 border border-b-0 ${col.color}`}>
                <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                <span className="text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="border border-t-0 border-gray-200 rounded-b-xl min-h-[200px] p-2 space-y-2 bg-gray-50">
                {cards.map((ncr) => {
                  const days = daysUntilDue(ncr.due_date)
                  const overdue = isOverdue(ncr.due_date) && ncr.status !== 'completed'
                  return (
                    <Link
                      key={ncr.id}
                      href={`/ncr/${ncr.id}`}
                      className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs text-gray-400">{ncr.ncr_code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[ncr.severity]}`}>
                          {SEVERITY_LABELS[ncr.severity]}
                        </span>
                      </div>

                      <p className="text-sm text-gray-800 line-clamp-2 mb-2">{ncr.description}</p>

                      {ncr.capa_rejection_notes && ncr.status === 'analysing' && (
                        <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mb-2">
                          Bị từ chối: {ncr.capa_rejection_notes.slice(0, 60)}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{ncr.department?.name ?? '—'}</span>
                        {ncr.due_date && (
                          <span className={overdue ? 'text-red-500 font-medium' : days !== null && days <= 3 ? 'text-orange-500' : ''}>
                            {overdue
                              ? `Quá hạn ${Math.abs(days!)} ngày`
                              : days === 0 ? 'Hôm nay'
                              : `${days} ngày`}
                          </span>
                        )}
                      </div>

                      {ncr.assignee && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          👤 {ncr.assignee.full_name}
                        </div>
                      )}
                    </Link>
                  )
                })}

                {cards.length === 0 && (
                  <p className="text-xs text-gray-300 text-center pt-6">Không có vấn đề</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
