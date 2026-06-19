'use client'

import type { ReactNode } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import type { ControlChecklist, DocumentLearningAssets } from '@/lib/learning-assets'

interface Props {
  assets: DocumentLearningAssets
  recommendedQuizCount?: number
  saving: boolean
  onChange: (assets: DocumentLearningAssets) => void
  onCancel: () => void
  onConfirm: () => void
}

type SummaryKey = keyof DocumentLearningAssets['summary_card']

export default function LearningAssetsReviewModal({ assets, recommendedQuizCount = 3, saving, onChange, onCancel, onConfirm }: Props) {
  function updateSummaryText(key: SummaryKey, value: string) {
    onChange({ ...assets, summary_card: { ...assets.summary_card, [key]: value } })
  }

  function updateSummaryList(key: SummaryKey, index: number, value: string) {
    const current = Array.isArray(assets.summary_card[key]) ? assets.summary_card[key] as string[] : []
    onChange({
      ...assets,
      summary_card: {
        ...assets.summary_card,
        [key]: current.map((item, i) => i === index ? value : item),
      },
    })
  }

  function addSummaryListItem(key: SummaryKey) {
    const current = Array.isArray(assets.summary_card[key]) ? assets.summary_card[key] as string[] : []
    onChange({ ...assets, summary_card: { ...assets.summary_card, [key]: [...current, ''] } })
  }

  function removeSummaryListItem(key: SummaryKey, index: number) {
    const current = Array.isArray(assets.summary_card[key]) ? assets.summary_card[key] as string[] : []
    onChange({ ...assets, summary_card: { ...assets.summary_card, [key]: current.filter((_, i) => i !== index) } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 md:p-4">
      <div className="flex h-[96vh] w-full max-w-[1500px] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Kiểm tra nội dung AI trước khi lưu</h2>
            <p className="text-sm text-gray-500">Chỉnh summary, câu hỏi, SOP verification, manager confirmation và audit checklist trước khi lưu.</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          <div className="space-y-7">
            <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
              <PanelTitle title="1. Summary card" />
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                <Field label="Mục đích">
                  <textarea
                    value={assets.summary_card.purpose}
                    onChange={e => updateSummaryText('purpose', e.target.value)}
                    rows={3}
                    className="input resize-y bg-white text-sm leading-6"
                  />
                </Field>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <SummaryList title="Ai làm gì" items={assets.summary_card.responsibilities} onAdd={() => addSummaryListItem('responsibilities')} onUpdate={(i, v) => updateSummaryList('responsibilities', i, v)} onRemove={i => removeSummaryListItem('responsibilities', i)} />
                <SummaryList title="Các bước quan trọng" items={assets.summary_card.critical_steps} onAdd={() => addSummaryListItem('critical_steps')} onUpdate={(i, v) => updateSummaryList('critical_steps', i, v)} onRemove={i => removeSummaryListItem('critical_steps', i)} />
                <SummaryList title="Đừng bao giờ" items={assets.summary_card.hard_rules} onAdd={() => addSummaryListItem('hard_rules')} onUpdate={(i, v) => updateSummaryList('hard_rules', i, v)} onRemove={i => removeSummaryListItem('hard_rules', i)} />
                <SummaryList title="Hồ sơ cần điền" items={assets.summary_card.required_records} onAdd={() => addSummaryListItem('required_records')} onUpdate={(i, v) => updateSummaryList('required_records', i, v)} onRemove={i => removeSummaryListItem('required_records', i)} />
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <PanelTitle title="2. Quiz" />
                    <p className="mt-1 text-xs text-gray-500">
                      Khuyến nghị tối thiểu {recommendedQuizCount} câu theo mức quan trọng. Hiện có {assets.quiz.length} câu.
                    </p>
                  </div>
                  <button type="button" onClick={addQuizQuestion} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">
                    <Plus size={14} /> Thêm câu hỏi
                  </button>
                </div>
                {assets.quiz.length < recommendedQuizCount && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Số câu quiz đang thấp hơn khuyến nghị cho mức quan trọng này.
                  </div>
                )}
                <div className="mt-3 grid gap-4 xl:grid-cols-3">
                  {assets.quiz.map((question, questionIndex) => (
                    <div key={questionIndex} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Câu {questionIndex + 1}</span>
                        <button type="button" onClick={() => removeQuizQuestion(questionIndex)} className="text-gray-400 hover:text-red-600" title="Xóa câu hỏi">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <Field label={`Câu ${questionIndex + 1}`}>
                        <textarea
                          value={question.question}
                          onChange={e => onChange({
                            ...assets,
                            quiz: assets.quiz.map((q, i) => i === questionIndex ? { ...q, question: e.target.value } : q),
                          })}
                          rows={4}
                          className="input"
                        />
                      </Field>
                      <div className="mt-3 space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <label key={optionIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={question.correct_answer === optionIndex}
                              onChange={() => onChange({
                                ...assets,
                                quiz: assets.quiz.map((q, i) => i === questionIndex ? { ...q, correct_answer: optionIndex } : q),
                              })}
                              className="accent-blue-600"
                            />
                            <textarea
                              value={option}
                              onChange={e => onChange({
                                ...assets,
                                quiz: assets.quiz.map((q, i) => i === questionIndex ? {
                                  ...q,
                                  options: q.options.map((o, j) => j === optionIndex ? e.target.value : o),
                                } : q),
                              })}
                              rows={2}
                              className="input min-h-0 py-2 text-sm"
                            />
                          </label>
                        ))}
                      </div>
                      <Field label="Giải thích">
                        <textarea
                          value={question.explanation}
                          onChange={e => onChange({
                            ...assets,
                            quiz: assets.quiz.map((q, i) => i === questionIndex ? { ...q, explanation: e.target.value } : q),
                          })}
                          rows={3}
                          className="input mt-3 min-h-0 py-2 text-sm"
                        />
                      </Field>
                    </div>
                  ))}
                  {!assets.quiz.length && <p className="py-2 text-sm text-gray-400">Chưa có câu hỏi quiz.</p>}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <ControlChecklistEditor
                  title="3. SOP verification"
                  description="Checklist cho nhân viên xác nhận toàn bộ công việc trong kỳ đã làm đúng SOP."
                  checklist={assets.worker_verification}
                  onChange={worker_verification => onChange({ ...assets, worker_verification })}
                />
                <ControlChecklistEditor
                  title="4. Manager confirmation"
                  description="Checklist cho quản lý trực tiếp review checklist nhân viên, lý do No và quyết định xử lý."
                  checklist={assets.manager_confirmation}
                  onChange={manager_confirmation => onChange({ ...assets, manager_confirmation })}
                />
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <PanelTitle title="5. Monthly audit checklist" />
                <div className="mt-3 grid gap-4 xl:grid-cols-2">
                  {assets.audit_checklist.map((item, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Hạng mục {index + 1}</span>
                        <button type="button" onClick={() => onChange({ ...assets, audit_checklist: assets.audit_checklist.filter((_, i) => i !== index) })} className="text-gray-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <AuditField label="Cần kiểm tra" value={item.item} onChange={value => updateAuditItem(index, 'item', value)} />
                        <AuditField label="Cách kiểm tra" value={item.check_method} onChange={value => updateAuditItem(index, 'check_method', value)} />
                        <AuditField label="Dấu hiệu đạt" value={item.pass_criteria} onChange={value => updateAuditItem(index, 'pass_criteria', value)} />
                        <AuditField label="Dấu hiệu không đạt" value={item.fail_criteria} onChange={value => updateAuditItem(index, 'fail_criteria', value)} />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => onChange({ ...assets, audit_checklist: [...assets.audit_checklist, { item: '', check_method: '', pass_criteria: '', fail_criteria: '' }] })} className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-blue-600">
                    <Plus size={14} /> Thêm mục kiểm toán
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm">Hủy</button>
          <button type="button" onClick={onConfirm} disabled={saving} className="btn-primary text-sm">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Lưu tài liệu
          </button>
        </div>
      </div>
    </div>
  )

  function updateAuditItem(index: number, key: 'item' | 'check_method' | 'pass_criteria' | 'fail_criteria', value: string) {
    onChange({
      ...assets,
      audit_checklist: assets.audit_checklist.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    })
  }

  function addQuizQuestion() {
    onChange({
      ...assets,
      quiz: [
        ...assets.quiz,
        {
          question: '',
          options: ['', '', '', ''],
          correct_answer: 0,
          explanation: '',
        },
      ],
    })
  }

  function removeQuizQuestion(index: number) {
    onChange({ ...assets, quiz: assets.quiz.filter((_, itemIndex) => itemIndex !== index) })
  }
}

function PanelTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}

function SummaryList({ title, items, onAdd, onUpdate, onRemove }: {
  title: string
  items: string[]
  onAdd: () => void
  onUpdate: (index: number, value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
          <Plus size={13} /> Thêm
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <textarea value={item} onChange={e => onUpdate(index, e.target.value)} rows={3} className="input min-h-0 resize-y bg-gray-50 py-2 text-sm leading-5" />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:text-red-600"
              title="Xóa mục"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!items.length && <p className="py-2 text-xs text-gray-400">Chưa có nội dung.</p>}
      </div>
    </div>
  )
}

function ControlChecklistEditor({ title, description, checklist, onChange }: {
  title: string
  description: string
  checklist: ControlChecklist
  onChange: (value: ControlChecklist) => void
}) {
  function updateItem(index: number, key: 'item' | 'instruction', value: string) {
    onChange({
      ...checklist,
      items: checklist.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <PanelTitle title={title} />
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      <div className="mt-4 space-y-3">
        {checklist.items.map((item, index) => (
          <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Mục {index + 1}</span>
              <button type="button" onClick={() => onChange({ ...checklist, items: checklist.items.filter((_, i) => i !== index) })} className="text-gray-400 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <AuditField label="Câu xác nhận" value={item.item} onChange={value => updateItem(index, 'item', value)} />
              <AuditField label="Hướng dẫn / nếu No thì ghi gì" value={item.instruction} onChange={value => updateItem(index, 'instruction', value)} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ ...checklist, items: [...checklist.items, { item: '', instruction: '' }] })} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">
          <Plus size={14} /> Thêm mục xác nhận
        </button>
      </div>
    </div>
  )
}

function AuditField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      <textarea value={value} onChange={event => onChange(event.target.value)} rows={3} className="input min-h-0 py-2 text-sm" />
    </label>
  )
}
