'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Loader2, MessageSquare, Search, Send, X } from 'lucide-react'
import type { AppUser } from '@/types'

type View = 'mine' | 'scope' | 'month'
type Answer = 'pass' | 'fail'

export default function ChecklistIsoClient({ user }: { user: AppUser }) {
  const today = localDate(new Date())
  const [view, setView] = useState<View>('mine')
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [checklist, setChecklist] = useState<any>(null)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [scopeUsers, setScopeUsers] = useState<any[]>([])
  const [scopeDepartments, setScopeDepartments] = useState<any[]>([])
  const [scopeFactories, setScopeFactories] = useState<any[]>([])
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('')
  const [monthDays, setMonthDays] = useState<any[]>([])
  const [scopeMonth, setScopeMonth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lateReason, setLateReason] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const canViewScope = ['department_head', 'factory_admin', 'coo', 'super_admin'].includes(user.role)

  const loadMine = useCallback(async () => {
    setLoading(true); setError('')
    const res = await fetch(`/api/checklists?view=mine&date=${date}`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Không thể tải checklist'); return }
    setChecklist(data.checklist)
    setResponses(data.checklist?.responses ?? {})
  }, [date])

  const canFilterFactory = ['coo', 'super_admin'].includes(user.role)

  const loadScope = useCallback(async () => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ view: 'scope', date })
    if (selectedFactoryId) params.set('factory_id', selectedFactoryId)
    const res = await fetch(`/api/checklists?${params}`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Không thể tải dữ liệu'); return }
    setScopeUsers(data.users ?? [])
    setScopeDepartments(data.departments ?? [])
    if (data.factories?.length) setScopeFactories(data.factories)
  }, [date, selectedFactoryId])

  const loadMonth = useCallback(async () => {
    setLoading(true); setError('')
    const params = new URLSearchParams({ view: 'month', month })
    if (canViewScope) params.set('scope', '1')
    if (selectedFactoryId) params.set('factory_id', selectedFactoryId)
    const res = await fetch(`/api/checklists?${params}`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Không thể tải tháng'); return }
    setMonthDays(data.days ?? [])
    setScopeMonth(Boolean(data.scope))
    if (data.factories?.length) setScopeFactories(data.factories)
  }, [canViewScope, month, selectedFactoryId])

  useEffect(() => {
    if (view === 'mine') loadMine()
    if (view === 'scope') loadScope()
    if (view === 'month') loadMonth()
  }, [loadMine, loadMonth, loadScope, view])

  async function saveResponses(next: Record<string, any>, submit = false) {
    if (!checklist) return
    setSaving(true); setError('')
    const res = await fetch(`/api/checklists/${checklist.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: next, submit, late_reason: lateReason }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Không thể lưu checklist'); return }
    setChecklist(data.checklist)
    setResponses(data.checklist.responses ?? {})
  }

  function updateAnswer(key: string, answer: Answer) {
    const next = { ...responses, [key]: { ...responses[key], answer } }
    setResponses(next)
    saveResponses(next)
  }

  function updateComment(key: string, comment: string) {
    setResponses(current => ({ ...current, [key]: { ...current[key], comment } }))
  }

  const questions = useMemo(
    () => Array.isArray(checklist?.questions) ? checklist.questions : [],
    [checklist?.questions]
  )
  const groups = useMemo(() => groupQuestions(questions), [questions])
  const progress = progressFor(questions, responses)
  const isSubmitted = checklist?.status === 'submitted'
  const isLate = date < today

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Checklist ISO</h1>
          <p className="text-sm text-gray-500">Thực hiện, theo dõi và xác nhận checklist theo vị trí công việc.</p>
        </div>
        <div className="inline-flex rounded-md border border-gray-200 bg-white p-1">
          <Tab active={view === 'mine'} onClick={() => setView('mine')}>Của tôi</Tab>
          {canViewScope && <Tab active={view === 'scope'} onClick={() => setView('scope')}>{user.role === 'department_head' ? 'Bộ phận' : 'Tổng quan'}</Tab>}
          <Tab active={view === 'month'} onClick={() => setView('month')}>Tháng</Tab>
        </div>
      </div>

      {view !== 'month' && (
        <DateNavigator date={date} today={today} onChange={setDate} />
      )}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex min-h-60 items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
      ) : view === 'mine' ? (
        <MineView
          checklist={checklist}
          groups={groups}
          responses={responses}
          progress={progress}
          submitted={isSubmitted}
          future={date > today}
          late={isLate}
          lateReason={lateReason}
          saving={saving}
          onAnswer={updateAnswer}
          onComment={updateComment}
          onCommentBlur={() => saveResponses(responses)}
          onLateReason={setLateReason}
          onSubmit={() => saveResponses(responses, true)}
        />
      ) : view === 'scope' ? (
        <ScopeView
          users={scopeUsers}
          departments={scopeDepartments}
          showDepartments={user.role !== 'department_head'}
          factories={scopeFactories}
          canFilterFactory={canFilterFactory}
          selectedFactoryId={selectedFactoryId}
          onFactoryChange={setSelectedFactoryId}
          onSelectEmployee={setSelectedEmployee}
        />
      ) : (
        <MonthView
          month={month} today={today} days={monthDays} scoped={scopeMonth}
          factories={scopeFactories} canFilterFactory={canFilterFactory}
          selectedFactoryId={selectedFactoryId} onFactoryChange={setSelectedFactoryId}
          onMonth={setMonth} onDate={(selected: string) => { setDate(selected); setView(scopeMonth ? 'scope' : 'mine') }}
        />
      )}

      {selectedEmployee && (
        <EmployeeReportModal employee={selectedEmployee} date={date} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  )
}

function MineView({ checklist, groups, responses, progress, submitted, future, late, lateReason, saving, onAnswer, onComment, onCommentBlur, onLateReason, onSubmit }: any) {
  if (future) return <EmptyState text="Chưa đến ngày thực hiện." />
  if (!checklist) return <EmptyState text="Tài khoản chưa được gán vị trí hoặc vị trí chưa có lịch checklist." />

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-3">
        {groups.map((group: any) => {
          const groupProgress = progressFor(group.questions.map((item: any) => item.question), responses)
          return (
            <section key={group.key} className="overflow-hidden rounded-md border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900"><span className="font-mono text-blue-700">{group.code}</span> - {group.title}</p>
                  <p className="text-xs text-gray-500">{groupProgress.answered}/{groupProgress.total} đã trả lời</p>
                </div>
                {group.questionHref && <a href={group.questionHref} className="text-xs font-medium text-blue-600">Xem SOP</a>}
              </div>
              <div className="divide-y divide-gray-100">
                {group.questions.map(({ question, key }: any, index: number) => {
                  const response = responses[key] ?? {}
                  const needsReason = response.answer === 'fail'
                  return (
                    <div key={key} className="px-4 py-3">
                      <p className="text-sm font-medium leading-6 text-gray-900">{index + 1}. {question.item}</p>
                      {question.instruction && <p className="mt-0.5 text-xs text-gray-500">{question.instruction}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AnswerButton label="Đạt" value="pass" selected={response.answer} disabled={submitted} onClick={() => onAnswer(key, 'pass')} />
                        <AnswerButton label="Không đạt" value="fail" selected={response.answer} disabled={submitted} onClick={() => onAnswer(key, 'fail')} />
                      </div>
                      {(needsReason || response.comment) && (
                        <label className="mt-3 block">
                          <span className="mb-1 block text-xs font-medium text-gray-600">{needsReason ? 'Lý do *' : 'Ghi chú'}</span>
                          <textarea
                            value={response.comment ?? ''}
                            onChange={event => onComment(key, event.target.value)}
                            onBlur={onCommentBlur}
                            disabled={submitted}
                            rows={2}
                            className="input min-h-0 resize-y py-2 text-sm"
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <aside className="h-fit rounded-md border border-gray-200 bg-white p-4 xl:sticky xl:top-4">
        <p className="text-sm font-semibold text-gray-900">Tiến độ</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{progress.answered}/{progress.total}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-blue-600" style={{ width: `${progress.total ? (progress.answered / progress.total) * 100 : 0}%` }} />
        </div>
        {progress.failures > 0 && <p className="mt-3 text-sm text-red-600">{progress.failures} mục không đạt</p>}
        {late && !submitted && (
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Lý do hoàn thành trễ *</span>
            <textarea value={lateReason} onChange={event => onLateReason(event.target.value)} rows={3} className="input min-h-0 py-2 text-sm" />
          </label>
        )}
        <button type="button" onClick={onSubmit} disabled={submitted || saving || progress.answered !== progress.total} className="btn-primary mt-4 w-full text-sm">
          {saving ? <Loader2 size={15} className="animate-spin" /> : submitted ? <CheckCircle2 size={15} /> : <Send size={15} />}
          {submitted ? 'Đã hoàn thành' : 'Hoàn thành checklist'}
        </button>
      </aside>
    </div>
  )
}

function ScopeView({ users, departments, showDepartments, factories, canFilterFactory, selectedFactoryId, onFactoryChange, onSelectEmployee }: {
  users: any[]; departments: any[]; showDepartments: boolean;
  factories: any[]; canFilterFactory: boolean; selectedFactoryId: string; onFactoryChange: (id: string) => void;
  onSelectEmployee: (employee: any) => void
}) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const totals = users.reduce((acc, item) => {
    const status = item.checklist?.status ?? 'not_started'
    acc[status] = (acc[status] ?? 0) + 1
    acc.failures += item.checklist?.progress?.failures ?? 0
    return acc
  }, { submitted: 0, in_progress: 0, not_started: 0, failures: 0 } as Record<string, number>)

  const filteredUsers = useMemo(() => {
    let result = users
    if (selectedDeptId) result = result.filter(u => u.department_id === selectedDeptId)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(u => u.full_name.toLowerCase().includes(q))
    }
    return result
  }, [users, selectedDeptId, searchQuery])

  return (
    <div className="space-y-4">
      {/* Factory filter for coo/super_admin */}
      {canFilterFactory && factories.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Nhà máy:</label>
          <select
            value={selectedFactoryId}
            onChange={e => onFactoryChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tất cả nhà máy</option>
            {factories.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Hoàn thành" value={totals.submitted} />
        <Metric label="Đang làm" value={totals.in_progress} />
        <Metric label="Chưa làm" value={totals.not_started} />
        <Metric label="Không đạt" value={totals.failures} tone="red" />
      </div>

      {/* Department table - clickable rows to filter employees */}
      {showDepartments && (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2.5">Bộ phận</th>
                <th className="px-4 py-2.5">Hoàn thành</th>
                <th className="px-4 py-2.5">Đang làm</th>
                <th className="px-4 py-2.5">Chưa làm</th>
                <th className="px-4 py-2.5">Không đạt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map(item => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedDeptId(prev => prev === item.id ? '' : item.id)}
                  className={`cursor-pointer transition-colors ${selectedDeptId === item.id ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.name}
                    {selectedDeptId === item.id && <span className="ml-2 text-xs text-blue-600">(đang lọc)</span>}
                  </td>
                  <td className="px-4 py-3 text-green-700">{item.submitted}/{item.users}</td>
                  <td className="px-4 py-3 text-yellow-700">{item.in_progress}</td>
                  <td className="px-4 py-3 text-gray-600">{item.not_started}</td>
                  <td className="px-4 py-3 text-red-600">{item.failures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee search + table */}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {(selectedDeptId || searchQuery) && (
            <button
              onClick={() => { setSelectedDeptId(''); setSearchQuery('') }}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              Xoá bộ lọc
            </button>
          )}
          <span className="text-xs text-gray-400">{filteredUsers.length}/{users.length}</span>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="px-4 py-2.5">Nhân viên</th><th className="px-4 py-2.5">Bộ phận</th><th className="px-4 py-2.5">Vị trí</th><th className="px-4 py-2.5">Tiến độ</th><th className="px-4 py-2.5">Không đạt</th><th className="px-4 py-2.5">Trạng thái</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map(item => {
              const progress = item.checklist?.progress ?? { answered: 0, total: 0, failures: 0 }
              const hasChecklist = !!item.checklist
              return (
                <tr
                  key={item.id}
                  onClick={() => hasChecklist && onSelectEmployee(item)}
                  className={hasChecklist ? 'cursor-pointer hover:bg-blue-50 transition-colors' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className={hasChecklist ? 'text-blue-700 underline decoration-blue-200' : ''}>{item.full_name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{(item.department as any)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.job_position?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{progress.answered}/{progress.total}</td>
                  <td className="px-4 py-3 text-red-600">{progress.failures}</td>
                  <td className="px-4 py-3"><StatusLabel status={item.checklist?.status ?? 'not_started'} /></td>
                </tr>
              )
            })}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Không tìm thấy nhân viên.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmployeeReportModal({ employee, date, onClose }: { employee: any; date: string; onClose: () => void }) {
  const checklist = employee.checklist
  const questions = Array.isArray(checklist?.questions) ? checklist.questions : []
  const employeeResponses = checklist?.responses ?? {}
  const groups = groupQuestions(questions)
  const progress = progressFor(questions, employeeResponses)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[5vh]" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 rounded-t-xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">{employee.full_name}</h2>
            <p className="text-sm text-gray-500">
              {employee.job_position?.title ?? '—'} · {formatDate(date)} · <StatusLabel status={checklist?.status ?? 'not_started'} />
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3">
            <div className="rounded-md border border-gray-200 px-3 py-2">
              <p className="text-xs text-gray-500">Trả lời</p>
              <p className="text-lg font-bold text-gray-900">{progress.answered}/{progress.total}</p>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2">
              <p className="text-xs text-gray-500">Đạt</p>
              <p className="text-lg font-bold text-green-700">{countByAnswer(questions, employeeResponses, 'pass')}</p>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2">
              <p className="text-xs text-gray-500">Không đạt</p>
              <p className="text-lg font-bold text-red-600">{progress.failures}</p>
            </div>
            {checklist?.submitted_at && (
              <div className="rounded-md border border-gray-200 px-3 py-2">
                <p className="text-xs text-gray-500">Nộp lúc</p>
                <p className="text-sm font-semibold text-gray-900">{new Date(checklist.submitted_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )}
          </div>

          {checklist?.late_reason && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2">
              <p className="text-xs font-medium text-yellow-800">Lý do hoàn thành trễ</p>
              <p className="mt-1 text-sm text-yellow-900">{checklist.late_reason}</p>
            </div>
          )}

          {/* Questions grouped by process */}
          {groups.map((group: any) => (
            <section key={group.key} className="overflow-hidden rounded-md border border-gray-200">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900"><span className="font-mono text-blue-700">{group.code}</span> - {group.title}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {group.questions.map(({ question, key }: any, index: number) => {
                  const response = employeeResponses[key] ?? {}
                  return (
                    <div key={key} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-900">{index + 1}. {question.item}</p>
                        <AnswerBadge answer={response.answer} />
                      </div>
                      {question.instruction && <p className="mt-0.5 text-xs text-gray-400">{question.instruction}</p>}
                      {response.comment && (
                        <div className="mt-2 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          {response.comment}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {questions.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">Chưa có câu hỏi nào.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function AnswerBadge({ answer }: { answer?: string }) {
  if (answer === 'pass') return <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Đạt</span>
  if (answer === 'fail') return <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Không đạt</span>
  return <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-400">Chưa trả lời</span>
}

function MonthView({ month, today, days, scoped, factories, canFilterFactory, selectedFactoryId, onFactoryChange, onMonth, onDate }: {
  month: string
  today: string
  days: any[]
  scoped: boolean
  factories: any[]
  canFilterFactory: boolean
  selectedFactoryId: string
  onFactoryChange: (id: string) => void
  onMonth: (month: string) => void
  onDate: (date: string) => void
}) {
  const [year, monthNumber] = month.split('-').map(Number)
  const count = new Date(year, monthNumber, 0).getDate()
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay()
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1
  const byDate = new Map(days.map((item: any) => [item.checklist_date, item]))
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)]

  function moveMonth(delta: number) {
    const value = new Date(year, monthNumber - 1 + delta, 1)
    onMonth(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      {canFilterFactory && factories.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Nhà máy:</label>
          <select
            value={selectedFactoryId}
            onChange={e => onFactoryChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tất cả nhà máy</option>
            {factories.map(f => <option key={f.id} value={f.id}>{f.name} ({f.code})</option>)}
          </select>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => moveMonth(-1)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><ChevronLeft size={18} /></button>
        <h2 className="font-semibold text-gray-900">Tháng {monthNumber}/{year}</h2>
        <button onClick={() => moveMonth(1)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 border-l border-t border-gray-200 text-center text-xs font-medium text-gray-500">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <div key={label} className="border-b border-r border-gray-200 py-2">{label}</div>)}
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="min-h-20 border-b border-r border-gray-200 bg-gray-50" />
          const date = `${month}-${String(day).padStart(2, '0')}`
          const instance: any = byDate.get(date)
          const future = date > today
          const sunday = new Date(year, monthNumber - 1, day).getDay() === 0
          return (
            <button key={date} onClick={() => !future && !sunday && onDate(date)} disabled={future || sunday} className={`min-h-20 border-b border-r border-gray-200 p-2 text-left hover:bg-gray-50 ${date === today ? 'bg-blue-50' : ''}`}>
              <span className="text-sm font-semibold text-gray-700">{day}</span>
              <div className="mt-2"><CalendarStatus instance={instance} future={future} sunday={sunday} scoped={scoped} /></div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DateNavigator({ date, today, onChange }: any) {
  function move(delta: number) {
    const next = new Date(`${date}T12:00:00`)
    next.setDate(next.getDate() + delta)
    onChange(localDate(next))
  }
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <button onClick={() => move(-1)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" title="Ngày trước"><ChevronLeft size={18} /></button>
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-gray-400" />
        <input type="date" value={date} onChange={event => onChange(event.target.value)} className="border-0 bg-transparent text-sm font-semibold text-gray-900 outline-none" />
        {date === today && <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Hôm nay</span>}
      </div>
      <button onClick={() => move(1)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" title="Ngày sau"><ChevronRight size={18} /></button>
    </div>
  )
}

function AnswerButton({ label, value, selected, disabled, onClick }: any) {
  const active = selected === value
  const tone = value === 'pass' ? 'border-green-300 bg-green-50 text-green-700' : value === 'fail' ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300 bg-gray-100 text-gray-700'
  return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${active ? tone : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'} disabled:opacity-60`}>{active && <Check size={13} className="mr-1 inline" />}{label}</button>
}

function Tab({ active, onClick, children }: any) {
  return <button onClick={onClick} className={`rounded px-3 py-1.5 text-sm font-medium ${active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{children}</button>
}

function Metric({ label, value, tone }: any) {
  return <div className="rounded-md border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value}</p></div>
}

function StatusLabel({ status }: { status: string }) {
  if (status === 'submitted') return <span className="text-green-700">Hoàn thành</span>
  if (status === 'in_progress') return <span className="text-yellow-700">Đang làm</span>
  return <span className="text-gray-500">Chưa làm</span>
}

function CalendarStatus({ instance, future, sunday, scoped }: any) {
  if (sunday) return <span className="text-gray-300">Không yêu cầu</span>
  if (future) return <Circle size={15} className="text-gray-300" />
  if (!instance) return <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle size={14} /> Chưa làm</span>
  if (scoped) {
    return (
      <span className="text-gray-700">
        <span className="font-semibold text-green-700">{instance.submitted}/{instance.total_users}</span>
        {instance.failures > 0 && <span className="ml-1 text-red-600">· {instance.failures} lỗi</span>}
      </span>
    )
  }
  if (instance.status === 'submitted') return <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={14} /> Hoàn thành</span>
  return <span className="inline-flex items-center gap-1 text-yellow-700"><MessageSquare size={14} /> {instance.progress?.answered ?? 0}/{instance.progress?.total ?? 0}</span>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-16 text-center text-sm text-gray-500">{text}</div>
}

function groupQuestions(questions: any[]) {
  const groups = new Map<string, any>()
  questions.forEach((question, index) => {
    const key = String(question.process_id ?? question.doc_code ?? 'manual')
    const item = { question, key: String(question.id ?? `${key}:${index}`) }
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        code: question.doc_code ?? 'MANUAL',
        title: question.process_title ?? 'Câu hỏi thủ công',
        questionHref: question.process_id ? `/documents/${question.process_id}` : null,
        questions: [],
      })
    }
    groups.get(key).questions.push(item)
  })
  return Array.from(groups.values())
}

function progressFor(questions: any[], responses: Record<string, any>) {
  let answered = 0
  let failures = 0
  questions.forEach((question, index) => {
    const key = String(question.id ?? `${question.process_id ?? 'question'}:${index}`)
    if (responses[key]?.answer) answered += 1
    if (responses[key]?.answer === 'fail') failures += 1
  })
  return { total: questions.length, answered, failures }
}

function countByAnswer(questions: any[], responses: Record<string, any>, answer: string) {
  let count = 0
  questions.forEach((question, index) => {
    const key = String(question.id ?? `${question.process_id ?? 'question'}:${index}`)
    if (responses[key]?.answer === answer) count += 1
  })
  return count
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function localDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date)
}
