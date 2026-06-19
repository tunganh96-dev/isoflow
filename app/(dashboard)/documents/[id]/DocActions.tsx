'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Send, Plus, Loader2, Download, Trash2 } from 'lucide-react'
import type { AppUser, Document } from '@/types'
import { canApproveQualityRecord } from '@/lib/roles'
import { vi } from '@/lib/i18n/vi'

interface Props {
  doc: Document & { factory?: { id: string; name: string; code: string } | null }
  user: AppUser
  canEdit: boolean
}

export default function DocActions({ doc, user, canEdit }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [newVersionType, setNewVersionType] = useState<'minor' | 'major'>('minor')
  const [revisionSummary, setRevisionSummary] = useState('')
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
    if (!res.ok) { setError(data.error ?? vi.error_generic_short); return false }
    return true
  }

  async function handleSubmit() {
    if (await post(`/api/documents/${doc.id}/submit`)) router.refresh()
  }

  async function handleApprove() {
    if (await post(`/api/documents/${doc.id}/approve`)) {
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
    if (!revisionSummary.trim()) {
      setError('Vui lòng nhập nội dung thay đổi của phiên bản mới')
      return
    }

    setLoading(true)
    setError('')
    const res = await fetch(`/api/documents/${doc.id}/version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision_type: newVersionType,
        revision_summary: revisionSummary.trim(),
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Không thể tạo phiên bản mới')
      return
    }

    setShowVersionModal(false)
    router.push(`/documents/${data.document.id}/edit`)
  }

  async function handleDeleteDraft() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Không thể xóa bản nháp')
      return
    }

    setShowDeleteModal(false)
    router.push('/documents?view=updating')
  }

  const isManager = canApproveQualityRecord(user.role)

  return (
    <>
      {error && !showApproveModal && !showRejectModal && !showVersionModal && !showDeleteModal && (
        <div className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/documents/${doc.id}/export/word`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download size={15} />
          Word
        </a>
        <a
          href={`/api/documents/${doc.id}/export/pdf`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download size={15} />
          PDF
        </a>

        {/* Owner: submit draft */}
        {doc.status === 'draft' && canEdit && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Gửi phê duyệt
          </button>
        )}

        {/* Owner: edit draft */}
        {doc.status === 'draft' && canEdit && (
          <a
            href={`/documents/${doc.id}/edit`}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Chỉnh sửa
          </a>
        )}

        {/* Owner/admin: delete draft */}
        {doc.status === 'draft' && canEdit && (
          <button
            onClick={() => { setError(''); setShowDeleteModal(true) }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={15} />
            Xóa bản nháp
          </button>
        )}

        {/* Admin: approve / reject */}
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

        {/* Admin or owner: create new version */}
        {doc.status === 'published' && canEdit && (
          <button
            onClick={() => { setError(''); setShowVersionModal(true) }}
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
              <p className="text-sm text-gray-600">
                Tài liệu sẽ được xuất bản cho các bộ phận bắt buộc học đã cấu hình trong thông tin tài liệu.
              </p>
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

      {/* New version modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Tạo phiên bản mới</h2>
            <p className="mt-1 text-sm text-gray-500">
              Phiên bản hiện tại v{doc.version} sẽ được lưu trữ. Phiên bản v{doc.version + 1} được tạo ở trạng thái bản nháp.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Loại thay đổi</label>
                <div className="flex gap-5">
                  {(['minor', 'major'] as const).map(value => (
                    <label key={value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        checked={newVersionType === value}
                        onChange={() => setNewVersionType(value)}
                        className="accent-blue-600"
                      />
                      <span className="text-sm">
                        {value === 'minor' ? 'Thay đổi nhỏ' : 'Thay đổi lớn'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nội dung thay đổi / lý do tạo phiên bản mới *
                </label>
                <textarea
                  value={revisionSummary}
                  onChange={event => setRevisionSummary(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Cập nhật bước kiểm tra hàng không phù hợp và bổ sung trách nhiệm của Trưởng QA."
                />
                <p className="mt-1 text-xs text-gray-400">Nội dung này sẽ hiển thị trong lịch sử phiên bản.</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowVersionModal(false); setError('') }}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleNewVersion}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Tạo bản nháp v{doc.version + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete draft modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Xóa bản nháp?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Bản nháp <span className="font-mono">{doc.doc_code}</span> sẽ bị xóa khỏi danh sách Đang cập nhật. Hành động này không thể hoàn tác.
            </p>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setError('') }}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteDraft}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Xóa bản nháp
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
