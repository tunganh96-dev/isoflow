'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus, Send, CheckCircle, XCircle, Upload, FileText, Stamp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/types'

interface Props {
  ncr: any
  user: AppUser
  qaUsers: { id: string; full_name: string; role: string }[]
}

export default function NcrActions({ ncr, user, qaUsers }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<string | null>(null)

  // Form state
  const [assignTo, setAssignTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [rootCause, setRootCause] = useState(ncr.root_cause_analysis ?? '')
  const [proposedCapa, setProposedCapa] = useState(ncr.proposed_capa ?? '')
  const [rejectNotes, setRejectNotes] = useState('')
  const [implNotes, setImplNotes] = useState(ncr.implementation_notes ?? '')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [verifyNotes, setVerifyNotes] = useState('')

  const isManager = user.role === 'qa_manager'
  const isAssignee = ncr.assigned_to === user.id

  async function post(path: string, body?: object) {
    setLoading(true); setError('')
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

  async function uploadEvidence(): Promise<string[]> {
    if (!evidenceFiles.length) return []
    const supabase = createClient()
    const urls: string[] = []
    for (const f of evidenceFiles) {
      const { data } = await supabase.storage.from('ncr-evidence').upload(`${Date.now()}-${f.name}`, f)
      if (data) urls.push(data.path)
    }
    return urls
  }

  async function refresh() { setModal(null); router.refresh() }

  return (
    <>
      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      <div className="flex flex-wrap gap-2 mb-4">
        {/* ASSIGN — manager, NCR is open */}
        {isManager && ncr.status === 'open' && (
          <button onClick={() => setModal('assign')} className="btn-primary">
            <UserPlus size={15} /> Phân công
          </button>
        )}

        {/* SUBMIT CAPA — assignee, analysing */}
        {isAssignee && ncr.status === 'analysing' && (
          <button onClick={() => setModal('capa')} className="btn-primary">
            <Send size={15} /> Gửi phân tích & CAPA
          </button>
        )}

        {/* APPROVE / REJECT CAPA — manager */}
        {isManager && ncr.status === 'pending_capa_approval' && (
          <>
            <button onClick={() => setModal('approve-capa')} className="btn-success">
              <CheckCircle size={15} /> Phê duyệt CAPA
            </button>
            <button onClick={() => setModal('reject-capa')} className="btn-danger">
              <XCircle size={15} /> Từ chối CAPA
            </button>
          </>
        )}

        {/* SUBMIT EVIDENCE — assignee, implementing */}
        {isAssignee && ncr.status === 'implementing' && (
          <button onClick={() => setModal('evidence')} className="btn-primary">
            <Upload size={15} /> Báo cáo hoàn thành
          </button>
        )}

        {/* VERIFY — manager, pending_verification */}
        {isManager && ncr.status === 'pending_verification' && (
          <button onClick={() => setModal('verify')} className="btn-primary">
            <CheckCircle size={15} /> Xác nhận hiệu quả
          </button>
        )}

        {/* GENERATE CLOSURE — manager, completed, no closure yet */}
        {isManager && ncr.status === 'completed' && !ncr.closure_report && (
          <button onClick={async () => {
            if (await post(`/api/ncr/${ncr.id}/generate-closure`)) refresh()
          }} disabled={loading} className="btn-primary">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            Tạo báo cáo đóng
          </button>
        )}

        {/* APPROVE CLOSURE — manager, has closure, not yet approved */}
        {isManager && ncr.closure_report && !ncr.closure_approved_at && (
          <button onClick={async () => {
            if (await post(`/api/ncr/${ncr.id}/approve-closure`)) refresh()
          }} disabled={loading} className="btn-success">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Stamp size={15} />}
            Phê duyệt báo cáo đóng
          </button>
        )}
      </div>

      {/* ASSIGN MODAL */}
      {modal === 'assign' && (
        <Modal title="Phân công xử lý NCR" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Người phụ trách *</label>
              <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className="input">
                <option value="">-- Chọn người --</option>
                {qaUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Hạn xử lý *</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <ModalFooter loading={loading} onCancel={() => setModal(null)} onConfirm={async () => {
            if (await post(`/api/ncr/${ncr.id}/assign`, { assigned_to: assignTo, due_date: dueDate })) refresh()
          }} label="Xác nhận phân công" />
        </Modal>
      )}

      {/* SUBMIT CAPA MODAL */}
      {modal === 'capa' && (
        <Modal title="Phân tích nguyên nhân & CAPA" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Phân tích nguyên nhân gốc rễ (5-Why) *</label>
              <textarea value={rootCause} onChange={e => setRootCause(e.target.value)} rows={5} className="input" placeholder="Tại sao xảy ra? → Tại sao? → Tại sao? → Tại sao? → Tại sao?" />
            </div>
            <div>
              <label className="label">Đề xuất hành động khắc phục *</label>
              <textarea value={proposedCapa} onChange={e => setProposedCapa(e.target.value)} rows={3} className="input" placeholder="Hành động cụ thể để khắc phục nguyên nhân gốc rễ..." />
            </div>
          </div>
          <ModalFooter loading={loading} onCancel={() => setModal(null)} onConfirm={async () => {
            if (await post(`/api/ncr/${ncr.id}/submit-capa`, { root_cause_analysis: rootCause, proposed_capa: proposedCapa })) refresh()
          }} label="Gửi phân tích" />
        </Modal>
      )}

      {/* APPROVE CAPA MODAL */}
      {modal === 'approve-capa' && (
        <Modal title="Phê duyệt CAPA" onClose={() => setModal(null)}>
          <p className="text-sm text-gray-600">Xác nhận phê duyệt hành động khắc phục và chuyển sang giai đoạn thực hiện?</p>
          <ModalFooter loading={loading} onCancel={() => setModal(null)} onConfirm={async () => {
            if (await post(`/api/ncr/${ncr.id}/approve-capa`)) refresh()
          }} label="Phê duyệt" confirmClass="btn-success" />
        </Modal>
      )}

      {/* REJECT CAPA MODAL */}
      {modal === 'reject-capa' && (
        <Modal title="Từ chối CAPA" onClose={() => setModal(null)}>
          <div>
            <label className="label">Lý do từ chối *</label>
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} className="input" placeholder="Nêu rõ lý do để người phụ trách phân tích lại..." />
          </div>
          <ModalFooter loading={loading} onCancel={() => setModal(null)} onConfirm={async () => {
            if (await post(`/api/ncr/${ncr.id}/reject-capa`, { notes: rejectNotes })) refresh()
          }} label="Xác nhận từ chối" confirmClass="btn-danger" />
        </Modal>
      )}

      {/* SUBMIT EVIDENCE MODAL */}
      {modal === 'evidence' && (
        <Modal title="Báo cáo hoàn thành thực hiện" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Mô tả hành động đã thực hiện *</label>
              <textarea value={implNotes} onChange={e => setImplNotes(e.target.value)} rows={4} className="input" placeholder="Mô tả chi tiết những gì đã làm để khắc phục..." />
            </div>
            <div>
              <label className="label">Ảnh/tài liệu bằng chứng</label>
              <input type="file" multiple accept="image/*,.pdf" onChange={e => setEvidenceFiles(Array.from(e.target.files ?? []))} className="text-sm" />
            </div>
          </div>
          <ModalFooter loading={loading} onCancel={() => setModal(null)} onConfirm={async () => {
            setLoading(true)
            const evidence_urls = await uploadEvidence()
            setLoading(false)
            if (await post(`/api/ncr/${ncr.id}/submit-evidence`, { implementation_notes: implNotes, evidence_urls })) refresh()
          }} label="Gửi báo cáo" />
        </Modal>
      )}

      {/* VERIFY MODAL */}
      {modal === 'verify' && (
        <Modal title="Xác nhận hiệu quả hành động khắc phục" onClose={() => setModal(null)}>
          <div>
            <label className="label">Ghi chú xác nhận</label>
            <textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} rows={3} className="input" placeholder="Ghi chú thêm về kết quả xác nhận (tùy chọn)" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={async () => {
              if (await post(`/api/ncr/${ncr.id}/verify`, { effective: false, notes: verifyNotes })) refresh()
            }} disabled={loading} className="flex-1 btn-danger">
              Chưa hiệu quả
            </button>
            <button onClick={async () => {
              if (await post(`/api/ncr/${ncr.id}/verify`, { effective: true, notes: verifyNotes })) refresh()
            }} disabled={loading} className="flex-1 btn-success">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null} Đã hiệu quả
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ loading, onCancel, onConfirm, label, confirmClass = 'btn-primary' }: {
  loading: boolean; onCancel: () => void; onConfirm: () => void; label: string; confirmClass?: string
}) {
  return (
    <div className="flex gap-3 mt-6">
      <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
      <button onClick={onConfirm} disabled={loading} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${confirmClass}`}>
        {loading && <Loader2 size={14} className="animate-spin" />}{label}
      </button>
    </div>
  )
}
