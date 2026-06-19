'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DOC_TYPE_LABELS } from '@/lib/documents'
import { frequenciesForImportance, PROCESS_IMPORTANCE_DESCRIPTIONS, PROCESS_IMPORTANCE_LABELS, type ProcessImportanceLevel } from '@/lib/process-importance'
import { Sparkles, PenLine, Loader2, ChevronLeft, Info } from 'lucide-react'
import Link from 'next/link'
import RelatedResourcePicker from '@/components/RelatedResourcePicker'
import { vi } from '@/lib/i18n/vi'

type Mode = 'ai' | 'manual'
type ControlFrequency = 'daily' | 'weekly' | 'monthly'
type CrossAuditFrequency = 'none' | 'monthly' | 'quarterly'

export default function NewDocumentPage() {
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('manual')
  const [title, setTitle] = useState('')
  const [docCode, setDocCode] = useState('')
  const [docType, setDocType] = useState('sop')
  const [description, setDescription] = useState('')
  const [processImportanceLevel, setProcessImportanceLevel] = useState<ProcessImportanceLevel>(3)
  const [mainDepartmentId, setMainDepartmentId] = useState('')
  const [departmentIds, setDepartmentIds] = useState<string[]>([])
  const [resourceIds, setResourceIds] = useState<string[]>([])

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('departments')
      .select('id, name')
      .order('name')
      .then(({ data }) => { if (data) setDepartments(data) })
  }, [])

  async function handleCreate() {
    if (!docCode.trim()) { setError('Vui lòng nhập mã tài liệu'); return }
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề'); return }
    if (!mainDepartmentId) { setError('Vui lòng chọn bộ phận chính'); return }
    if (mode === 'ai' && !description.trim()) { setError('Vui lòng nhập mô tả để AI tạo nội dung'); return }
    setError('')
    setCreating(true)

    try {
      let content = ''
      let mermaid_code: string | null = null

      if (mode === 'ai') {
        // Generate content with AI
        const res = await fetch('/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, doc_type: docType, description }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Lỗi tạo nội dung AI'); setCreating(false); return }
        content = data.content
        mermaid_code = data.mermaid_code ?? null
      }

      // mode === 'manual' → content stays empty, user writes in edit page

      // Save draft
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          doc_code: docCode,
          doc_type: docType,
          process_importance_level: processImportanceLevel,
          content: content || '',
          mermaid_code,
          factory_id: null,
          department_id: mainDepartmentId,
          department_ids: departmentIds,
          resource_ids: resourceIds,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Lỗi tạo tài liệu'); setCreating(false); return }

      // Redirect to edit workspace
      router.push(`/documents/${data.document.id}/edit`)
    } catch {
      setError(vi.error_generic)
      setCreating(false)
    }
  }

  const modes: { key: Mode; icon: typeof Sparkles; label: string; desc: string }[] = [
    { key: 'manual', icon: PenLine, label: 'Tự viết', desc: 'Viết tài liệu từ đầu' },
    { key: 'ai', icon: Sparkles, label: 'Tạo bằng AI', desc: 'AI tạo nội dung từ mô tả của bạn' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <Link href="/documents" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Tạo tài liệu mới</h1>
      </div>

      {/* Mode selection */}
      <div className="mb-3 grid gap-3 md:grid-cols-2 xl:max-w-3xl">
        {modes.map(({ key, icon: Icon, label, desc }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setError('') }}
            className={`text-left rounded-lg border px-4 py-3 transition-all ${
              mode === key
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Icon size={18} className={mode === key ? 'mb-1.5 text-blue-600' : 'mb-1.5 text-gray-400'} />
            <p className={`text-sm font-semibold ${mode === key ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      <div className="min-h-[calc(100dvh-11.5rem)] rounded-xl border border-gray-200 bg-white">
        <div className="flex min-h-[calc(100dvh-11.5rem)] flex-col space-y-4 p-5">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Thông tin tài liệu</h2>
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
              <div>
                <label className="label">Mã tài liệu *</label>
                <input
                  value={docCode}
                  onChange={e => setDocCode(e.target.value.toUpperCase())}
                  className="input font-mono"
                  placeholder="Vd: QT.09-QA"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-400">Nhập theo hệ thống mã tài liệu hiện tại.</p>
              </div>

              <div>
                <label className="label">Tên tài liệu *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                  placeholder="Vd: Quy trình kiểm soát chất lượng đầu vào"
                />
              </div>

              <div>
                <label className="label">Loại tài liệu *</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="input">
                  {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 max-w-md">
              <label className="label">Bộ phận chính *</label>
              <select value={mainDepartmentId} onChange={event => setMainDepartmentId(event.target.value)} className="input">
                <option value="">Chọn bộ phận phụ trách quy trình</option>
                {departments.map(department => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">Bộ phận chịu trách nhiệm chính cho quy trình/tài liệu này.</p>
            </div>
            <div className="mt-4 max-w-md">
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <label className="label mb-0">Mức quan trọng *</label>
                  <ImportanceInfo />
                </div>
                <select value={processImportanceLevel} onChange={event => {
                  const level = Number(event.target.value) as ProcessImportanceLevel
                  setProcessImportanceLevel(level)
                }} className="input">
                  {[5, 4, 3, 2, 1].map(level => (
                    <option key={level} value={level}>{PROCESS_IMPORTANCE_LABELS[level as ProcessImportanceLevel]}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">Dùng để ưu tiên khi checklist hằng ngày vượt quá 10 câu.</p>
              </div>
            </div>
          </section>

          {mode === 'ai' && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Mô tả cho AI</h2>
              <label className="label">Mô tả nội dung *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input min-h-28"
                rows={4}
                placeholder="Mô tả chi tiết nội dung tài liệu để AI tạo chính xác hơn. Vd: Quy trình kiểm tra nguyên liệu đầu vào bao gồm kiểm tra ngoại quan, đo kích thước, test độ bền..."
              />
            </div>
          )}

          <section className="min-h-0 flex-1">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Phân phối và tài liệu liên quan</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="label">Bộ phận bắt buộc học</label>
                <p className="mb-2 text-xs text-gray-400">Các bộ phận liên quan cần biết và xác nhận học tài liệu này.</p>
                <div className="grid h-[min(34dvh,20rem)] min-h-60 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2 md:grid-cols-2">
                  {departments.map(department => (
                    <label key={department.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={departmentIds.includes(department.id)}
                        onChange={() => setDepartmentIds(current => (
                          current.includes(department.id)
                            ? current.filter(id => id !== department.id)
                            : [...current, department.id]
                        ))}
                        className="accent-blue-600"
                      />
                      {department.name}
                    </label>
                  ))}
                </div>
              </div>

              <RelatedResourcePicker selectedIds={resourceIds} onChange={setResourceIds} />
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
            {error ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : (
              <p className="text-sm text-gray-400">Sau khi tạo, tài liệu sẽ mở trong trình soạn thảo 9 mục ISO.</p>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary min-h-0 px-5 py-2.5 text-sm"
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'ai' ? 'AI đang tạo nội dung...' : 'Đang tạo...'}
                </>
              ) : (
                'Tạo tài liệu'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImportanceInfo() {
  const levels: ProcessImportanceLevel[] = [5, 4, 3, 2, 1]
  return (
    <span className="group relative inline-flex">
      <Info size={14} className="text-gray-400" />
      <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-[34rem] rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-xl group-hover:block">
        <span className="mb-2 block font-semibold text-gray-900">Tần suất mặc định theo mức quan trọng</span>
        <span className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr] gap-2 border-b border-gray-100 pb-1 font-semibold text-gray-700">
          <span>Level</span><span>SOP</span><span>Xác nhận</span><span>Audit</span>
        </span>
        {levels.map(level => {
          const defaults = frequenciesForImportance(level)
          return (
            <span key={level} className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr] gap-2 border-b border-gray-50 py-1 last:border-0">
              <span><b>{level}</b> - {PROCESS_IMPORTANCE_DESCRIPTIONS[level]}</span>
              <span>{frequencyLabel(defaults.worker)}</span>
              <span>{frequencyLabel(defaults.manager)}</span>
              <span>{crossAuditLabel(defaults.crossAudit)}</span>
            </span>
          )
        })}
      </span>
    </span>
  )
}

function frequencyLabel(value: ControlFrequency) {
  if (value === 'daily') return 'Ngày'
  if (value === 'weekly') return 'Tuần'
  return 'Tháng'
}

function crossAuditLabel(value: CrossAuditFrequency) {
  if (value === 'none') return 'Không'
  if (value === 'monthly') return 'Tháng'
  return 'Quý'
}
