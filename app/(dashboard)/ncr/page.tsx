import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { NCR_COLUMNS, SEVERITY_COLORS, SEVERITY_LABELS, isOverdue, daysUntilDue } from '@/lib/ncr'

export default async function NcrPage() {
  const user = await getCurrentUser()
  const supabase = createClient()

  const { data: ncrs } = await supabase
    .from('ncrs')
    .select(`
      id, ncr_code, description, severity, status, due_date, raised_at,
      department:department_id (name),
      assignee:assigned_to (full_name),
      capa_rejection_notes
    `)
    .order('raised_at', { ascending: false })

  const grouped = Object.fromEntries(
    NCR_COLUMNS.map(col => [col.status, (ncrs ?? []).filter((n: any) => n.status === col.status)])
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">NCR & CAPA</h1>
        <Link
          href="/ncr/new"
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Tạo NCR mới
        </Link>
      </div>

      {/* Kanban — horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
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
                {cards.map((ncr: any) => {
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
                        <span>{(ncr.department as any)?.name ?? '—'}</span>
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
                          👤 {(ncr.assignee as any).full_name}
                        </div>
                      )}
                    </Link>
                  )
                })}

                {cards.length === 0 && (
                  <p className="text-xs text-gray-300 text-center pt-6">Không có NCR</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
