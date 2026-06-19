import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, User, Building2, AlertTriangle } from 'lucide-react'
import { NCR_COLUMNS, SEVERITY_COLORS, SEVERITY_LABELS, isOverdue } from '@/lib/ncr'
import NcrActions from './NcrActions'

export default async function NcrDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  const supabase = createClient()

  const { data: ncr } = await supabase
    .from('ncrs')
    .select(`
      *,
      department:department_id (name),
      raiser:raised_by (full_name),
      assignee:assigned_to (id, full_name),
      verifier:verified_by (full_name),
      capa_approver:capa_approved_by (full_name),
      closure_approver:closure_approved_by (full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!ncr) notFound()

  const { data: activity } = await supabase
    .from('ncr_activity')
    .select('*, actor:user_id (full_name)')
    .eq('ncr_id', params.id)
    .order('created_at', { ascending: false })

  const { data: qaUsers } = await supabase
    .from('users')
    .select('id, full_name, role')
    .in('role', ['super_admin', 'coo', 'factory_admin', 'department_head', 'employee'])

  const colLabel = NCR_COLUMNS.find(c => c.status === ncr.status)?.label ?? ncr.status
  const overdue = isOverdue(ncr.due_date) && ncr.status !== 'completed'

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <Link href="/ncr" className="text-gray-400 hover:text-gray-600 mt-0.5"><ChevronLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-gray-400">{ncr.ncr_code}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[ncr.severity]}`}>
              {SEVERITY_LABELS[ncr.severity]}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{colLabel}</span>
            {overdue && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                <AlertTriangle size={11} /> Quá hạn
              </span>
            )}
          </div>
          <p className="text-base font-semibold text-gray-900">{ncr.description}</p>
        </div>
      </div>

      {/* Rejected badge */}
      {ncr.capa_rejection_notes && ncr.status === 'analysing' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
          <strong>CAPA bị từ chối:</strong> {ncr.capa_rejection_notes}
        </div>
      )}

      {/* Actions */}
      <NcrActions ncr={ncr} user={user} qaUsers={qaUsers ?? []} />

      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Bộ phận</p>
          <p className="font-medium flex items-center gap-1"><Building2 size={13} />{(ncr.department as any)?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Người phát hiện</p>
          <p className="font-medium">{ncr.reporter_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Người tạo</p>
          <p className="font-medium flex items-center gap-1"><User size={13} />{(ncr.raiser as any)?.full_name ?? '—'}</p>
        </div>
        {ncr.assignee && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Người phụ trách</p>
            <p className="font-medium">{(ncr.assignee as any).full_name}</p>
          </div>
        )}
        {ncr.due_date && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Hạn xử lý</p>
            <p className={`font-medium flex items-center gap-1 ${overdue ? 'text-red-500' : ''}`}>
              <Calendar size={13} />{new Date(ncr.due_date).toLocaleDateString('vi-VN')}
            </p>
          </div>
        )}
        {ncr.iso_clause && (
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Điều khoản ISO</p>
            <p className="font-medium text-xs">{ncr.iso_clause}</p>
          </div>
        )}
      </div>

      {/* Root cause & CAPA */}
      {ncr.root_cause_analysis && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Phân tích nguyên nhân (5-Why)</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.root_cause_analysis}</p>
          {ncr.proposed_capa && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Đề xuất hành động khắc phục</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.proposed_capa}</p>
            </>
          )}
          {ncr.capa_approver && (
            <p className="text-xs text-green-600 mt-3">✓ Phê duyệt bởi {(ncr.capa_approver as any).full_name}</p>
          )}
        </div>
      )}

      {/* Implementation */}
      {ncr.implementation_notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Kết quả thực hiện</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{ncr.implementation_notes}</p>
          {ncr.verification_notes && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Ghi chú xác nhận</h3>
              <p className="text-sm text-gray-700">{ncr.verification_notes}</p>
            </>
          )}
        </div>
      )}

      {/* Closure report */}
      {ncr.closure_report && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Báo cáo đóng vấn đề</h3>
          <p className="text-sm text-green-900 whitespace-pre-wrap">{ncr.closure_report}</p>
          {ncr.closure_approver && (
            <p className="text-xs text-green-600 mt-3">✓ Phê duyệt bởi {(ncr.closure_approver as any).full_name}</p>
          )}
        </div>
      )}

      {/* Activity log */}
      {activity && activity.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Lịch sử hoạt động</h3>
          <div className="space-y-3">
            {activity.map((a: any) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                <div>
                  <span className="font-medium text-gray-700">{a.actor?.full_name ?? '—'}</span>
                  {' · '}
                  <span className="text-gray-500">{a.notes}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleString('vi-VN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
