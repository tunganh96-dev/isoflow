'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Check, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { PROCESS_IMPORTANCE_LABELS, type ProcessImportanceLevel } from '@/lib/process-importance'

type ProcessDoc = {
  id: string
  doc_code: string
  title: string
  status: string
  process_importance_level: number
  worker_frequency: string
  worker_questions: number
  manager_frequency: string
  manager_questions: number
  cross_audit_frequency: string
  audit_questions: number
}

type PlanQuestion = {
  id?: string
  process_id?: string | null
  process_title?: string
  frequency?: string
  doc_code?: string
  item: string
}

type DisplayQuestion = {
  question: PlanQuestion
  questionIndex: number
}

export default function JobDetailClient({ jobId, initialTitle, roleType, subtitle, documents, selectedDocumentIds, users, plans }: {
  jobId: string
  initialTitle: string
  roleType: string
  subtitle: string
  documents: ProcessDoc[]
  selectedDocumentIds: string[]
  users: { id: string; full_name: string; email: string }[]
  plans: { id: string; month: string; status: string; plan: any[]; generated_at: string }[]
}) {
  const [title, setTitle] = useState(initialTitle)
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(initialTitle)
  const [selected, setSelected] = useState(selectedDocumentIds)
  const [saving, setSaving] = useState(false)
  const [savingTitle, setSavingTitle] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [planState, setPlanState] = useState(plans[0] ?? null)
  const [planDays, setPlanDays] = useState<any[]>(plans[0]?.plan ?? [])
  const [addingDayIndex, setAddingDayIndex] = useState<number | null>(null)
  const [manualQuestion, setManualQuestion] = useState('')
  const [manualProcessId, setManualProcessId] = useState('')
  const [error, setError] = useState('')

  const selectedDocs = documents.filter(doc => selected.includes(doc.id))
  const checklistMode = checklistModeForRole(roleType)
  const totalChecklistQuestions = selectedDocs.reduce((sum, doc) => sum + questionCountForMode(doc, checklistMode), 0)
  const latestPlan = planState
  const firstPlanDays = planDays.slice(0, 6)
  const monthlyQuestions = (planDays[0]?.questions ?? []).filter((question: any) => question.frequency === 'monthly')

  const grouped = useMemo(() => ({
    l5: selectedDocs.filter(doc => doc.process_importance_level === 5).length,
    l4: selectedDocs.filter(doc => doc.process_importance_level === 4).length,
    l3: selectedDocs.filter(doc => doc.process_importance_level === 3).length,
    l2: selectedDocs.filter(doc => doc.process_importance_level === 2).length,
    l1: selectedDocs.filter(doc => doc.process_importance_level === 1).length,
  }), [selectedDocs])

  async function saveProcesses() {
    setSaving(true); setError('')
    const res = await fetch(`/api/settings/job-positions/${jobId}/processes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_ids: selected }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Không thể lưu quy trình'); return }
    window.location.reload()
  }

  async function saveTitle() {
    if (!draftTitle.trim()) { setError('Vui lòng nhập tên vị trí'); return }
    setSavingTitle(true); setError('')
    const res = await fetch(`/api/settings/job-positions/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draftTitle }),
    })
    const data = await res.json()
    setSavingTitle(false)
    if (!res.ok) { setError(data.error ?? 'Không thể cập nhật tên vị trí'); return }
    setTitle(data.job_position?.title ?? draftTitle.trim())
    setDraftTitle(data.job_position?.title ?? draftTitle.trim())
    setEditingTitle(false)
  }

  function cancelTitleEdit() {
    setDraftTitle(title)
    setEditingTitle(false)
  }

  async function generatePlan() {
    await loadPlan(false)
  }

  async function syncPlanFromProcesses() {
    await loadPlan(true)
  }

  async function loadPlan(rebuild: boolean) {
    setGenerating(true); setError('')
    const res = await fetch(`/api/settings/job-positions/${jobId}/monthly-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month: latestPlan?.month ?? new Date().toISOString().slice(0, 7),
        rebuild,
      }),
    })
    setGenerating(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Không thể tạo kế hoạch'); return }
    const data = await res.json()
    setPlanState({
      id: data.plan_id,
      month: data.month ?? new Date().toISOString().slice(0, 7),
      status: data.status ?? 'draft',
      plan: data.plan,
      generated_at: data.generated_at ?? '',
    })
    setPlanDays(data.plan ?? [])
  }

  async function savePlanEdits() {
    if (!latestPlan) return
    setSavingPlan(true); setError('')
    const res = await fetch(`/api/settings/job-positions/${jobId}/monthly-plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: latestPlan.month, plan: planDays }),
    })
    const data = await res.json()
    setSavingPlan(false)
    if (!res.ok) { setError(data.error ?? 'Không thể lưu chỉnh sửa lịch'); return }
    setPlanState(data.plan)
    setPlanDays(data.plan?.plan ?? [])
  }

  function removeQuestion(dayIndex: number, questionIndex: number) {
    setPlanDays(current => current.map((day, index) => (
      index === dayIndex
        ? { ...day, questions: (day.questions ?? []).filter((_: any, itemIndex: number) => itemIndex !== questionIndex) }
        : day
    )))
  }

  function addManualQuestion(dayIndex: number) {
    const text = manualQuestion.trim()
    const process = selectedDocs.find(doc => doc.id === manualProcessId)
    if (!text || !process) {
      setError('Vui lòng chọn quy trình và nhập câu hỏi')
      return
    }
    setPlanDays(current => current.map((day, index) => (
      index === dayIndex
        ? {
          ...day,
          questions: [
            ...(day.questions ?? []),
            {
              id: `manual:${Date.now()}`,
              process_id: process.id,
              doc_code: process.doc_code,
              process_title: process.title,
              importance_level: process.process_importance_level,
              frequency: 'manual',
              item: text,
              instruction: '',
              checklist_type: day.checklist_type,
              weight: 0,
            },
          ],
        }
        : day
    )))
    setManualQuestion('')
    setManualProcessId('')
    setAddingDayIndex(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex max-w-2xl items-center gap-2">
              <input
                value={draftTitle}
                onChange={event => setDraftTitle(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') saveTitle()
                  if (event.key === 'Escape') cancelTitleEdit()
                }}
                className="input text-base font-semibold"
                autoFocus
              />
              <button type="button" onClick={saveTitle} disabled={savingTitle} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50" title="Lưu tên vị trí">
                {savingTitle ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button type="button" onClick={cancelTitleEdit} disabled={savingTitle} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50" title="Hủy">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-lg font-bold text-gray-900">{title}</h2>
              <button type="button" onClick={() => { setDraftTitle(title); setEditingTitle(true); setError('') }} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Đổi tên vị trí">
                <Pencil size={15} />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <Link href="/settings/jobs" className="btn-secondary min-h-0 px-3 py-2 text-sm">Quay lại</Link>
      </div>

      <section className="grid gap-3 md:grid-cols-5">
        <Stat label="Users" value={users.length} />
        <Stat label="Processes selected" value={selected.length} />
        <Stat label="Checklist mode" value={checklistModeLabel(checklistMode)} />
        <Stat label="Question pool" value={totalChecklistQuestions} hint="Toàn bộ câu hỏi sẽ có trong mỗi ngày" />
        <Stat label="Levels" value={`${grouped.l5}/${grouped.l4}/${grouped.l3}/${grouped.l2}/${grouped.l1}`} hint="L5/L4/L3/L2/L1" />
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Related processes</h2>
            <p className="text-xs text-gray-500">Tick quy trình áp dụng cho vị trí này. Checklist tháng sẽ dùng {checklistModeLabel(checklistMode)} theo loại vị trí.</p>
          </div>
          <button onClick={saveProcesses} disabled={saving} className="btn-primary min-h-0 px-3 py-2 text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu quy trình
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Chọn</th>
                <th className="px-3 py-2 font-medium">Mã</th>
                <th className="px-3 py-2 font-medium">Tên quy trình</th>
                <th className="px-3 py-2 font-medium">Quan trọng</th>
                <th className="px-3 py-2 font-medium">SOP</th>
                <th className="px-3 py-2 font-medium">Manager</th>
                <th className="px-3 py-2 font-medium">Cross audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map(doc => {
                const isSelected = selected.includes(doc.id)
                const hasNoQuestions = isSelected && questionCountForMode(doc, checklistMode) === 0
                return (
                  <tr key={doc.id} className={`hover:bg-gray-50 ${hasNoQuestions ? 'bg-yellow-50' : ''}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={isSelected} onChange={() => setSelected(current => current.includes(doc.id) ? current.filter(id => id !== doc.id) : [...current, doc.id])} className="accent-blue-600" /></td>
                    <td className="px-3 py-2 font-mono text-xs text-blue-700">{doc.doc_code}</td>
                    <td className="px-3 py-2">
                      <Link href={`/documents/${doc.id}`} className="font-medium text-gray-900 hover:text-blue-700">{doc.title}</Link>
                      {hasNoQuestions && <p className="text-xs text-yellow-700 mt-0.5">Chưa có câu hỏi — mở tài liệu và tạo Learning Assets</p>}
                    </td>
                    <td className="px-3 py-2">{importanceLabel(doc.process_importance_level)}</td>
                    <td className="px-3 py-2 text-gray-600">{freqLabel(doc.worker_frequency)} · {doc.worker_questions} câu</td>
                    <td className="px-3 py-2 text-gray-600">{freqLabel(doc.manager_frequency)} · {doc.manager_questions} câu</td>
                    <td className="px-3 py-2 text-gray-600">{crossLabel(doc.cross_audit_frequency)} · {doc.audit_questions} câu</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Monthly checklist plan</h2>
            <p className="text-xs text-gray-500">Tạo lịch {checklistModeLabel(checklistMode)} một lần cho tháng đã chọn. Mỗi ngày chứa toàn bộ câu hỏi từ các quy trình đã chọn.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestPlan ? (
              <>
                <button onClick={syncPlanFromProcesses} disabled={generating} className="btn-primary min-h-0 px-3 py-2 text-sm" title="Tạo lại từ toàn bộ câu hỏi của các quy trình đã chọn; các chỉnh sửa thủ công trong lịch sẽ bị thay thế">
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />} Đồng bộ từ quy trình
                </button>
                <button onClick={savePlanEdits} disabled={savingPlan} className="btn-secondary min-h-0 px-3 py-2 text-sm">
                  {savingPlan ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu chỉnh sửa
                </button>
              </>
            ) : (
              <button onClick={generatePlan} disabled={generating || !selected.length} className="btn-primary min-h-0 px-3 py-2 text-sm">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />} Tạo & lưu
              </button>
            )}
          </div>
        </div>
        {latestPlan ? (
          <div>
            <p className="mb-2 text-sm text-gray-600">Lịch đã lưu · {latestPlan.status} · {planDays.length} ngày</p>
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="mb-2 text-xs font-semibold text-blue-800">Monthly tasks - ngày đầu tháng · {monthlyQuestions.length} câu</p>
              {monthlyQuestions.length ? (
                <ul className="list-disc space-y-1 pl-5 text-xs text-blue-950">
                  {monthlyQuestions.map((q: any) => <li key={q.id}>{q.doc_code}: {q.item}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-blue-700">Không có câu hỏi monthly trong lịch này.</p>
              )}
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {firstPlanDays.map((day: any, dayIndex: number) => {
                const visibleQuestions = questionsForDisplay(day)
                const processGroups = groupQuestionsByProcess(visibleQuestions)
                return (
                  <div key={day.date} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-500">{weekdayLabel(dayIndex)} · {visibleQuestions.length} câu</p>
                      <button type="button" onClick={() => {
                        setAddingDayIndex(dayIndex)
                        setManualQuestion('')
                        setManualProcessId(selectedDocs[0]?.id ?? '')
                        setError('')
                      }} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                        <Plus size={13} /> Thêm
                      </button>
                    </div>
                    {addingDayIndex === dayIndex && (
                      <div className="mb-3 space-y-2 rounded-md border border-blue-100 bg-blue-50/50 p-2">
                        <select value={manualProcessId} onChange={event => setManualProcessId(event.target.value)} className="input min-h-0 py-1.5 text-xs">
                          <option value="">Chọn quy trình</option>
                          {selectedDocs.map(doc => (
                            <option key={doc.id} value={doc.id}>{doc.doc_code} - {doc.title}</option>
                          ))}
                        </select>
                        <input value={manualQuestion} onChange={event => setManualQuestion(event.target.value)} className="input min-h-0 py-1.5 text-xs" placeholder="Nhập câu hỏi cho quy trình đã chọn" autoFocus />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => addManualQuestion(dayIndex)} className="rounded-md border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">Lưu</button>
                          <button type="button" onClick={() => {
                            setAddingDayIndex(null)
                            setManualQuestion('')
                            setManualProcessId('')
                          }} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-50">Hủy</button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {processGroups.map(group => (
                        <section key={group.key} className="overflow-hidden rounded-md border border-gray-200 bg-white">
                          <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-100/70 px-2.5 py-2">
                            <p className="min-w-0 truncate text-xs font-semibold text-gray-800">
                              <span className="font-mono text-blue-700">{group.docCode}</span>
                              {group.processTitle ? ` - ${group.processTitle}` : ''}
                            </p>
                            <span className="shrink-0 text-[11px] text-gray-500">{group.questions.length} câu</span>
                          </div>
                          <ul className="divide-y divide-gray-100 text-xs text-gray-700">
                            {group.questions.map(({ question, questionIndex }) => (
                              <li key={`${question.id}:${questionIndex}`} className="flex items-start gap-2 px-2.5 py-2">
                                <span className="min-w-0 flex-1">{frequencyBadge(question.frequency)} {question.item}</span>
                                <button type="button" onClick={() => removeQuestion(dayIndex, questionIndex)} className="shrink-0 text-gray-300 hover:text-red-600" title="Xóa câu hỏi khỏi ngày này">
                                  <Trash2 size={13} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">Chưa có kế hoạch tháng.</p>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>{hint && <p className="text-xs text-gray-400">{hint}</p>}</div>
}

function importanceLabel(value: number) {
  const level = (value >= 1 && value <= 5 ? value : 3) as ProcessImportanceLevel
  const tone = level >= 5
    ? 'bg-red-50 text-red-700'
    : level === 4
      ? 'bg-orange-50 text-orange-700'
      : level === 3
        ? 'bg-blue-50 text-blue-700'
        : 'bg-gray-100 text-gray-600'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{PROCESS_IMPORTANCE_LABELS[level]}</span>
}

function freqLabel(value: string) {
  if (value === 'weekly') return 'Tuần'
  if (value === 'monthly') return 'Tháng'
  return 'Ngày'
}

function crossLabel(value: string) {
  if (value === 'none') return 'Không'
  if (value === 'quarterly') return 'Quý'
  return 'Tháng'
}

function frequencyBadge(value: string | undefined) {
  if (value === 'weekly') return '[Weekly]'
  if (value === 'monthly') return '[Monthly]'
  if (value === 'quarterly') return '[Quarterly]'
  return '[Daily]'
}

function weekdayLabel(index: number) {
  return ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][index] ?? `Ngày ${index + 1}`
}

function questionsForDisplay(day: any): DisplayQuestion[] {
  const mapped: DisplayQuestion[] = (Array.isArray(day.questions) ? day.questions : [])
    .map((question: any, questionIndex: number) => ({ question, questionIndex }))
  return mapped.filter(({ question }: DisplayQuestion) => typeof question?.item === 'string' && question.item.trim())
}

function groupQuestionsByProcess(questions: DisplayQuestion[]) {
  const groups = new Map<string, {
    key: string
    docCode: string
    processTitle: string
    questions: DisplayQuestion[]
  }>()

  questions.forEach(displayQuestion => {
    const { question } = displayQuestion
    const key = question.process_id ?? question.doc_code ?? 'manual'
    const existing = groups.get(key)
    if (existing) {
      existing.questions.push(displayQuestion)
      return
    }

    groups.set(key, {
      key,
      docCode: question.doc_code ?? 'MANUAL',
      processTitle: question.process_title ?? (question.process_id ? '' : 'Câu hỏi thủ công'),
      questions: [displayQuestion],
    })
  })

  return Array.from(groups.values())
}

type ChecklistMode = 'sop_verification' | 'manager_confirmation'

function checklistModeForRole(roleType: string): ChecklistMode {
  return roleType === 'manager' || roleType === 'supervisor'
    ? 'manager_confirmation'
    : 'sop_verification'
}

function checklistModeLabel(mode: ChecklistMode) {
  return mode === 'manager_confirmation' ? 'Manager confirmation' : 'SOP verification'
}

function questionCountForMode(doc: ProcessDoc, mode: ChecklistMode) {
  return mode === 'manager_confirmation' ? doc.manager_questions : doc.worker_questions
}
