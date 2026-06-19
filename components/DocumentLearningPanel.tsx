'use client'

import { useState } from 'react'
import { CheckCircle, ClipboardCheck, Loader2, ShieldCheck, UserCheck, UsersRound } from 'lucide-react'
import type { ControlChecklist, DocumentLearningAssets } from '@/lib/learning-assets'

interface Props {
  documentId: string
  assets: DocumentLearningAssets | null
  canViewInternal: boolean
  initialPassed: boolean
  compact?: boolean
}

export default function DocumentLearningPanel({ documentId, assets, canViewInternal, initialPassed, compact = false }: Props) {
  const [showQuiz, setShowQuiz] = useState(false)
  const [answers, setAnswers] = useState<number[]>([])
  const [passed, setPassed] = useState(initialPassed)
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!assets) return null

  async function submitQuiz() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/documents/${documentId}/read-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Không thể xác nhận đọc')
      return
    }

    setResult(data)
    setPassed(data.passed)
    if (data.passed) setShowQuiz(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
        <div className={`${compact ? 'flex items-center justify-between gap-3' : 'flex flex-wrap items-center justify-between gap-3'}`}>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Xác nhận đọc</h2>
            {!compact && <p className="text-sm text-gray-500">Hoàn thành quiz để ghi nhận đã đọc và hiểu tài liệu.</p>}
          </div>
          {passed ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700">
              <CheckCircle size={15} /> Đã hoàn thành
            </span>
          ) : (
            <button type="button" onClick={() => setShowQuiz(true)} className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700">
              Đã xác nhận đọc
            </button>
          )}
        </div>

        {result && !result.passed && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Chưa đạt: {result.score}/{result.total}. Vui lòng đọc lại và làm lại quiz.
          </p>
        )}
      </div>

      {showQuiz && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Quiz xác nhận đọc</h2>
          <div className="space-y-4">
            {assets.quiz.map((question, questionIndex) => (
              <div key={questionIndex}>
                <p className="mb-2 text-sm font-medium text-gray-800">{questionIndex + 1}. {question.question}</p>
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                      <input
                        type="radio"
                        checked={answers[questionIndex] === optionIndex}
                        onChange={() => setAnswers(current => {
                          const next = [...current]
                          next[questionIndex] = optionIndex
                          return next
                        })}
                        className="mt-0.5 accent-blue-600"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowQuiz(false)} className="btn-secondary text-sm">Hủy</button>
            <button type="button" onClick={submitQuiz} disabled={loading || answers.length < assets.quiz.length} className="btn-primary text-sm">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Nộp quiz
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="mb-3 flex items-center gap-2 border-b border-blue-100 pb-2">
          <ClipboardCheck size={17} className="text-blue-700" />
          <h2 className="text-sm font-semibold text-blue-950">Summary card</h2>
        </div>
        <div className={`grid gap-4 text-sm text-blue-950 ${compact ? '' : 'md:grid-cols-2 xl:grid-cols-5'}`}>
          {assets.summary_card.purpose && <SummaryBlock title="Mục đích" items={[assets.summary_card.purpose]} />}
          <SummaryBlock title="Ai làm gì" items={assets.summary_card.responsibilities} />
          <SummaryBlock title="Các bước quan trọng" items={assets.summary_card.critical_steps} />
          <SummaryBlock title="Đừng bao giờ" items={assets.summary_card.hard_rules} />
          <SummaryBlock title="Hồ sơ cần điền" items={assets.summary_card.required_records} />
        </div>
      </div>

      <div className={`grid gap-4 ${compact ? '' : 'xl:grid-cols-2'}`}>
        <ControlChecklistPanel
          title="SOP verification"
          subtitle="Nhân viên xác nhận đã làm đúng quy trình trong kỳ."
          icon="worker"
          checklist={assets.worker_verification}
        />
        <ControlChecklistPanel
          title="Manager confirmation"
          subtitle="Quản lý trực tiếp review checklist nhân viên và các câu trả lời No."
          icon="manager"
          checklist={assets.manager_confirmation}
        />
      </div>

      {canViewInternal && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2 border-b border-amber-200 pb-2">
            <ShieldCheck size={17} className="text-amber-700" />
            <div className="flex flex-1 items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-amber-950">Cross audit checklist</h2>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-amber-800">{crossAuditFrequencyLabel(assets.cross_audit_frequency)}</span>
            </div>
          </div>
          <div className={`grid gap-2 ${compact ? '' : 'xl:grid-cols-2'}`}>
            {assets.audit_checklist.map((item, index) => (
              <div key={index} className="rounded-lg bg-white/75 px-3 py-3 text-sm text-amber-950">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-semibold">{index + 1}. {item.item}</p>
                  <div className="flex shrink-0 gap-1">
                    <span className="rounded border border-green-200 px-2 py-1 text-xs text-green-700">Đạt</span>
                    <span className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">Không đạt</span>
                    <span className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600">N/A</span>
                  </div>
                </div>
                <div className="grid gap-2 text-xs text-gray-600 md:grid-cols-3">
                  {item.check_method && <AuditDetail label="Cách kiểm tra" value={item.check_method} />}
                  {item.pass_criteria && <AuditDetail label="Dấu hiệu đạt" value={item.pass_criteria} tone="success" />}
                  {item.fail_criteria && <AuditDetail label="Dấu hiệu không đạt" value={item.fail_criteria} tone="danger" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ControlChecklistPanel({ title, subtitle, icon, checklist }: {
  title: string
  subtitle: string
  icon: 'worker' | 'manager'
  checklist: ControlChecklist
}) {
  if (!checklist.items.length) return null
  const Icon = icon === 'worker' ? UserCheck : UsersRound

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-emerald-100 pb-2">
        <div className="flex items-start gap-2">
          <Icon size={17} className="mt-0.5 text-emerald-700" />
          <div>
            <h2 className="text-sm font-semibold text-emerald-950">{title}</h2>
            <p className="text-xs text-emerald-800/80">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-emerald-800">{frequencyLabel(checklist.frequency)}</span>
        </div>
      </div>
      <div className="space-y-2">
        {checklist.items.map((item, index) => (
          <div key={index} className="rounded-lg bg-white/80 px-3 py-2 text-sm text-emerald-950">
            <p className="font-semibold">{index + 1}. {item.item}</p>
            {item.instruction && <p className="mt-1 text-xs text-gray-600">{item.instruction}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditDetail({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'danger' }) {
  const labelColor = tone === 'success' ? 'text-green-700' : tone === 'danger' ? 'text-red-700' : 'text-gray-600'
  return (
    <div className="rounded-md border border-amber-100 bg-white/80 p-2">
      <p className={`mb-0.5 font-semibold ${labelColor}`}>{label}</p>
      <p>{value}</p>
    </div>
  )
}

function frequencyLabel(value: string) {
  if (value === 'weekly') return 'Hàng tuần'
  if (value === 'monthly') return 'Hàng tháng'
  return 'Hàng ngày'
}

function crossAuditFrequencyLabel(value: string) {
  if (value === 'none') return 'Không cần'
  if (value === 'quarterly') return 'Hàng quý'
  return 'Hàng tháng'
}


function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase text-blue-700">{title}</h3>
      {items.length === 1 ? (
        <p>{items[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      )}
    </div>
  )
}
