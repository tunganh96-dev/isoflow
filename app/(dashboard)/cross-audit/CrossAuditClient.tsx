'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, Check, CheckCircle2, ClipboardList, History, Loader2, RefreshCw, Send } from 'lucide-react'
import type { AppUser } from '@/types'
import { isAdminRole } from '@/lib/roles'

type Factory = { id: string; name: string; code: string }
type Cycle = {
  id: string; month: string; status: string; confirmed_at: string | null
  auditor_department: { id: string; name: string; code: string }
  target_department: { id: string; name: string; code: string }
}
type AuditInstance = {
  id: string; cycle_id: string; month: string; status: string
  questions: AuditQuestion[]; responses: Record<string, AuditResponse>
  submitted_at: string | null
  target_department_id: string
}
type AuditQuestion = {
  id: string; document_id: string; doc_code: string; process_title: string
  item: string; check_method: string; pass_criteria: string; fail_criteria: string
}
type AuditResponse = { answer?: 'pass' | 'fail'; comment?: string }

export default function CrossAuditClient({ user, factories }: { user: AppUser; factories: Factory[] }) {
  const [tab, setTab] = useState<'current' | 'history'>('current')
  const isAdmin = isAdminRole(user.role)
  const isDeptHead = user.role === 'department_head'
  const [factoryId, setFactoryId] = useState(user.factory_id ?? factories[0]?.id ?? '')
  const factoryName = factories.find(f => f.id === factoryId)?.name ?? ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Kiểm tra chéo</h1>
          <p className="text-xs text-gray-500">Kiểm tra chéo giữa các bộ phận hàng tháng{factoryName ? ` · ${factoryName}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && factories.length > 1 && (
            <select value={factoryId} onChange={e => setFactoryId(e.target.value)} className="input min-h-0 w-auto py-1.5 text-sm">
              {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button onClick={() => setTab('current')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'current' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <ClipboardList size={14} /> Tháng này
            </button>
            <button onClick={() => setTab('history')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <History size={14} /> Lịch sử
            </button>
          </div>
        </div>
      </div>

      {tab === 'current' && isAdmin && <AdminCycleView factoryId={factoryId} />}
      {tab === 'current' && isDeptHead && <DeptHeadAuditView factoryId={factoryId} />}
      {tab === 'current' && !isAdmin && !isDeptHead && (
        <p className="py-12 text-center text-sm text-gray-400">Chức năng kiểm tra chéo dành cho trưởng bộ phận và quản lý ISO.</p>
      )}
      {tab === 'history' && <HistoryView factoryId={factoryId} />}
    </div>
  )
}

/** ISO/Admin view: manage monthly rotation */
function AdminCycleView({ factoryId }: { factoryId: string }) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const loadCycles = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/cross-audit/cycles?factory_id=${factoryId}&month=${month}`)
    const data = await res.json()
    setCycles(data.cycles ?? [])
    setLoading(false)
  }, [factoryId, month])

  useEffect(() => { loadCycles() }, [loadCycles])

  async function generate() {
    setGenerating(true); setError('')
    const res = await fetch('/api/cross-audit/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factory_id: factoryId, month }),
    })
    const data = await res.json()
    setGenerating(false)
    if (!res.ok) { setError(data.error ?? 'Lỗi'); return }
    setCycles(data.cycles ?? [])
  }

  async function confirm() {
    setConfirming(true); setError('')
    const res = await fetch('/api/cross-audit/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factory_id: factoryId, month, action: 'confirm' }),
    })
    setConfirming(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Lỗi'); return }
    loadCycles()
  }

  const allDraft = cycles.length > 0 && cycles.every(c => c.status === 'draft')
  const allConfirmed = cycles.length > 0 && cycles.every(c => c.status === 'confirmed' || c.status === 'completed')

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Lịch kiểm tra chéo</h2>
            <p className="text-xs text-gray-500">Tạo lịch ngẫu nhiên và xác nhận để bộ phận bắt đầu kiểm tra.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input min-h-0 w-auto py-1.5 text-sm" />
            <button onClick={generate} disabled={generating || allConfirmed} className="btn-primary min-h-0 px-3 py-1.5 text-sm" title={allConfirmed ? 'Đã xác nhận — không thể tạo lại' : ''}>
              {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Tạo lịch ngẫu nhiên
            </button>
            {allDraft && (
              <button onClick={confirm} disabled={confirming} className="btn-secondary min-h-0 px-3 py-1.5 text-sm border-green-200 text-green-700 hover:bg-green-50">
                {confirming ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Xác nhận
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : cycles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="py-8 text-center text-sm text-gray-400">Chưa có lịch kiểm tra chéo cho tháng {month}. Nhấn &quot;Tạo lịch ngẫu nhiên&quot; để bắt đầu.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Bộ phận kiểm tra</th>
                <th className="px-4 py-2.5 font-medium text-center"><ArrowRightLeft size={14} className="inline" /></th>
                <th className="px-4 py-2.5 font-medium">Bộ phận được kiểm tra</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cycles.map(cycle => (
                <tr key={cycle.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{cycle.auditor_department.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-400">→</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{cycle.target_department.name}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={cycle.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Department head view: do the audit */
function DeptHeadAuditView({ factoryId }: { factoryId: string }) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [instance, setInstance] = useState<AuditInstance | null>(null)
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [responses, setResponses] = useState<Record<string, AuditResponse>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [noScope, setNoScope] = useState('')

  const loadInstance = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/cross-audit/instances?factory_id=${factoryId}&month=${currentMonth}`)
    const data = await res.json()
    setInstance(data.instance ?? null)
    setCycle(data.cycle ?? null)
    setResponses(data.instance?.responses ?? {})
    if (data.error) setNoScope(data.error)
    setLoading(false)
  }, [factoryId, currentMonth])

  useEffect(() => { loadInstance() }, [loadInstance])

  function onAnswer(key: string, answer: 'pass' | 'fail') {
    setResponses(prev => ({
      ...prev,
      [key]: { ...prev[key], answer: prev[key]?.answer === answer ? undefined : answer },
    }))
  }

  function onComment(key: string, comment: string) {
    setResponses(prev => ({ ...prev, [key]: { ...prev[key], comment } }))
  }

  async function saveProgress() {
    if (!instance) return
    setSaving(true); setError('')
    const res = await fetch('/api/cross-audit/instances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_id: instance.id, responses }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Lỗi'); return }
    const data = await res.json()
    setInstance(data.instance)
  }

  async function submit() {
    if (!instance) return
    setSubmitting(true); setError('')
    const res = await fetch('/api/cross-audit/instances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_id: instance.id, responses, submit: true }),
    })
    setSubmitting(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Lỗi'); return }
    const data = await res.json()
    setInstance(data.instance)
    setResponses(data.instance.responses)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
  if (!cycle) return <p className="py-12 text-center text-sm text-gray-400">Tháng này chưa có lịch kiểm tra chéo được xác nhận cho bộ phận của bạn.</p>
  if (noScope) return <p className="py-12 text-center text-sm text-yellow-700 bg-yellow-50 rounded-xl px-4">{noScope}</p>
  if (!instance) return <p className="py-12 text-center text-sm text-gray-400">Không có phiên kiểm tra.</p>

  const questions = instance.questions ?? []
  const submitted = instance.status === 'submitted' || instance.status === 'reviewed'
  const answered = questions.filter(q => responses[q.id]?.answer).length
  const failures = questions.filter(q => responses[q.id]?.answer === 'fail').length

  // Group by process
  const groups = new Map<string, { docCode: string; title: string; questions: AuditQuestion[] }>()
  questions.forEach(q => {
    const key = q.document_id
    if (!groups.has(key)) groups.set(key, { docCode: q.doc_code, title: q.process_title, questions: [] })
    groups.get(key)!.questions.push(q)
  })

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Kiểm tra: <span className="text-blue-700">{(cycle.target_department as any)?.name ?? 'N/A'}</span>
            </p>
            <p className="text-xs text-gray-500">Tháng {currentMonth} · {answered}/{questions.length} câu · {failures} không đạt</p>
          </div>
          {!submitted && (
            <div className="flex gap-2">
              <button onClick={saveProgress} disabled={saving} className="btn-secondary min-h-0 px-3 py-1.5 text-sm">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Lưu tạm
              </button>
              <button onClick={submit} disabled={submitting || answered < questions.length} className="btn-primary min-h-0 px-3 py-1.5 text-sm">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Nộp
              </button>
            </div>
          )}
          {submitted && <StatusBadge status={instance.status} />}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {Array.from(groups.entries()).map(([docId, group]) => (
        <section key={docId} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              <span className="font-mono text-blue-700">{group.docCode}</span> — {group.title}
            </p>
            <p className="text-xs text-gray-500">{group.questions.length} mục kiểm tra</p>
          </div>
          <div className="divide-y divide-gray-100">
            {group.questions.map((q, qi) => {
              const resp = responses[q.id] ?? {}
              const needsComment = resp.answer === 'fail'
              return (
                <div key={q.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{qi + 1}. {q.item}</p>
                  {q.check_method && <p className="mt-0.5 text-xs text-gray-500">Phương pháp: {q.check_method}</p>}
                  <div className="mt-1 flex gap-4 text-xs text-gray-500">
                    {q.pass_criteria && <span className="text-green-700">Đạt: {q.pass_criteria}</span>}
                    {q.fail_criteria && <span className="text-red-600">Không đạt: {q.fail_criteria}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AnswerButton label="Đạt" value="pass" selected={resp.answer} disabled={submitted} onClick={() => onAnswer(q.id, 'pass')} />
                    <AnswerButton label="Không đạt" value="fail" selected={resp.answer} disabled={submitted} onClick={() => onAnswer(q.id, 'fail')} />
                  </div>
                  {(needsComment || resp.comment) && (
                    <textarea
                      value={resp.comment ?? ''}
                      onChange={e => onComment(q.id, e.target.value)}
                      disabled={submitted}
                      className="input mt-2 text-sm"
                      rows={2}
                      placeholder={needsComment ? 'Ghi lý do không đạt *' : 'Ghi chú'}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

/** History view */
function HistoryView({ factoryId }: { factoryId: string }) {
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generate last 6 months
    const now = new Date()
    const result: string[] = []
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      result.push(d.toISOString().slice(0, 7))
    }
    setMonths(result)
    if (result.length) setSelectedMonth(result[0])
  }, [])

  useEffect(() => {
    if (!selectedMonth) return
    setLoading(true)
    fetch(`/api/cross-audit/cycles?factory_id=${factoryId}&month=${selectedMonth}`)
      .then(res => res.json())
      .then(data => {
        setCycles(data.cycles ?? [])
        setLoading(false)
      })
  }, [factoryId, selectedMonth])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Lịch sử kiểm tra chéo</h2>
        <div className="flex flex-wrap gap-2">
          {months.map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${selectedMonth === m ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : cycles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="py-8 text-center text-sm text-gray-400">Không có lịch sử kiểm tra chéo cho tháng {selectedMonth}.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Bộ phận kiểm tra</th>
                <th className="px-4 py-2.5 font-medium">→</th>
                <th className="px-4 py-2.5 font-medium">Bộ phận được kiểm tra</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cycles.map(cycle => (
                <tr key={cycle.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{cycle.auditor_department.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">→</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{cycle.target_department.name}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={cycle.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function AnswerButton({ label, value, selected, disabled, onClick }: {
  label: string; value: string; selected?: string; disabled: boolean; onClick: () => void
}) {
  const isSelected = selected === value
  const base = value === 'pass'
    ? isSelected ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-200'
    : isSelected ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-200'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${base}`}>
      {label}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    confirmed: 'bg-blue-50 text-blue-700',
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-yellow-50 text-yellow-700',
    submitted: 'bg-green-50 text-green-700',
    reviewed: 'bg-purple-50 text-purple-700',
    completed: 'bg-green-50 text-green-700',
  }
  const labels: Record<string, string> = {
    draft: 'Nháp',
    confirmed: 'Đã xác nhận',
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang thực hiện',
    submitted: 'Đã nộp',
    reviewed: 'Đã duyệt',
    completed: 'Hoàn thành',
  }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>{labels[status] ?? status}</span>
}
