'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Send, Plus, Loader2 } from 'lucide-react'
import type { AppUser, Document } from '@/types'

interface Props {
  doc: Document & { factory?: { id: string; name: string; code: string } | null }
  user: AppUser
  factories: { id: string; name: string }[]
}

export default function DocActions({ doc, user, factories }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [revisionType, setRevisionType] = useState<'minor' | 'major'>('minor')
  const [assignFactory, setAssignFactory] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [error, setError] = useState('')

  async function post(path: string, body?: object) {
    setLoading(true)
    setError('')
    const res = await fetch(path, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Đã xảy ra lỗi'); return false }
    return true
  }

  async function handleSubmit() {
    if (await post(`/api/documents/${doc.id}/submit`)) router.refresh()
  }

  async function handleApprove() {
    if (await post(`/api/documents/${doc.id}/approve`, {
      revision_type: revisionType,
      factory_id: assignFactory || null,
    })) {
      setShowApproveModal(false)
      router.refresh()
    }
  }

  async function handleReject() {
    if (!rejectNotes.trim()) { setError('Vui lòng nhập lý do từ chối'); return }
    if (await post(`/api/documents/${doc.id}/reject`, { notes: rejectNotes })) {
      setShowRejectModal(false)
      router.refresh()
    }
  }

  async function handleNewVersion() {
    if (await post(`/api/documents/${doc.id}/version`)) {
      router.push('/documents')
    }
  }

  const isOwner = doc.owner_id === user.id
  const isManager = user.role === 'qa_manager'

  if (error) {
    return <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
  }

  return (
    <>
      {/* Action bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* qa_employee: submit draft */}
        {doc.status === 'draft' && isOwner && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Gửi phê duyệt
          </button>
        )}

        {/* qa_employee: edit draft */}
        {doc.status === 'draft' && isOwner && (
          <a
            href={`/documents/${doc.id}/edit`}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Chỉnh sửa
          </a>
        )}

        {/* qa_manager: approve / reject */}
        {doc.status === 'pending_approval' && isManager && (
          <>
            <button
              onClick={() => setShowApproveModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={15} />
              Phê duyệt
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="inline-flex items-center gap-2 bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <XCircle size={15} />
              Từ chối
            </button>
          </>
        )}

        {/* qa_manager or qa_employee: create new version */}
        {doc.status === 'published' && (isManager || isOwner) && (
          <button
            onClick={handleNewVersion}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Tạo phiên bản mới
          </button>
        )}
      </div>

      {/* Approve modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Phê duyệt tài liệu</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại thay đổi</label>
                <div className="flex gap-3">
                  {(['minor', 'major'] as const).map(v => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={v}
                        checked={revisionType === v}
                        onChange={() => setRevisionType(v)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm">{v === 'minor' ? 'Thay đổi nhỏ' : 'Thay đổi lớn'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phân công nhà máy</label>
                <select
                  value={assignFactory}
                  onChange={e => setAssignFactory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tất cả nhà máy</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Xác nhận phê duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Từ chối tài liệu</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối *</label>
              <textarea
                value={rejectNotes}
                onChange={e => setRejectNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Nhập lý do từ chối để thông báo cho người tạo..."
              />
            </div>

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
