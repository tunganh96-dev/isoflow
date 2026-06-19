'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FLOWCHART_TYPES } from '@/lib/documents'
import { normalizeDocumentMarkdown } from '@/lib/markdown'
import { EMPTY_LEARNING_ASSETS, type ControlFrequency, type CrossAuditFrequency, type DocumentLearningAssets } from '@/lib/learning-assets'
import { frequenciesForImportance, PROCESS_IMPORTANCE_DESCRIPTIONS, PROCESS_IMPORTANCE_LABELS, recommendedQuizQuestionsForImportance, type ProcessImportanceLevel } from '@/lib/process-importance'
import { Building2, ChevronLeft, FilePenLine, Info, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import IsoDocumentEditor from '@/components/IsoDocumentEditor'
import LearningAssetsReviewModal from '@/components/LearningAssetsReviewModal'
import { vi } from '@/lib/i18n/vi'

const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })
const AiChatPanel = dynamic(() => import('@/components/AiChatPanel'), { ssr: false })

interface Props {
  document: {
    id: string
    title: string
    content: string
    mermaid_code: string | null
    doc_type: string
    doc_code: string
    department_id: string | null
    process_importance: 'high' | 'medium' | 'low'
    process_importance_level: number | null
    flowchart_image_path: string | null
    flowchart_image_mime: string | null
  }
  initialLearningAssets: DocumentLearningAssets | null
  initialResourceIds: string[]
  initialDepartmentIds: string[]
  departments: { id: string; name: string }[]
}

export default function DocumentEditClient({ document, initialLearningAssets, initialResourceIds, initialDepartmentIds, departments }: Props) {
  const router = useRouter()
  const id = document.id

  const [title, setTitle] = useState(document.title)
  const [content, setContent] = useState(() => normalizeDocumentMarkdown(document.content ?? ''))
  const [mermaidCode, setMermaidCode] = useState(document.mermaid_code ?? '')
  const [docType] = useState(document.doc_type)
  const [docCode, setDocCode] = useState(document.doc_code)
  const [processImportanceLevel, setProcessImportanceLevel] = useState<ProcessImportanceLevel>(normalizeLevel(document.process_importance_level))
  const [mainDepartmentId, setMainDepartmentId] = useState(document.department_id ?? '')
  const [flowchartImagePath, setFlowchartImagePath] = useState(document.flowchart_image_path)
  const [saving, setSaving] = useState(false)
  const [generatingAssets, setGeneratingAssets] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')
  const [showAi, setShowAi] = useState(false)
  const [learningAssets, setLearningAssets] = useState<DocumentLearningAssets>(initialLearningAssets ?? EMPTY_LEARNING_ASSETS)
  const [showLearningAssetsModal, setShowLearningAssetsModal] = useState(false)
  const [resourceIds, setResourceIds] = useState(initialResourceIds)
  const [departmentIds, setDepartmentIds] = useState(initialDepartmentIds)
  const [showDocumentInfo, setShowDocumentInfo] = useState(false)

  async function handleAiUpdate() {
    if (!content.trim()) { setError('Nội dung tài liệu không được để trống'); return }
    setGeneratingAssets(true)
    setError('')
    const res = await fetch('/api/documents/learning-assets/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: id, title, doc_type: docType, process_importance_level: processImportanceLevel, content, current_assets: learningAssets }),
    })
    const data = await res.json()
    setGeneratingAssets(false)
    if (!res.ok) { setError(data.error ?? 'Không thể tạo nội dung đào tạo'); return }
    setLearningAssets(data.assets)
    setShowLearningAssetsModal(true)
  }

  async function saveDocument() {
    if (!content.trim()) { setError('Nội dung tài liệu không được để trống'); return }
    if (!docCode.trim() || !title.trim()) { setError('Mã và tên tài liệu không được để trống'); return }
    if (!mainDepartmentId) { setError('Vui lòng chọn bộ phận chính'); return }
    setSaving(true)
    setError('')
    const defaultFrequencies = frequenciesForImportance(processImportanceLevel)
    const learningAssetsWithDerivedFrequencies: DocumentLearningAssets = {
      ...learningAssets,
      worker_verification: {
        ...learningAssets.worker_verification,
        frequency: defaultFrequencies.worker,
      },
      manager_confirmation: {
        ...learningAssets.manager_confirmation,
        frequency: defaultFrequencies.manager,
      },
      cross_audit_frequency: defaultFrequencies.crossAudit,
    }
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        doc_code: docCode,
        department_id: mainDepartmentId,
        process_importance_level: processImportanceLevel,
        content,
        mermaid_code: mermaidCode || null,
        resource_ids: resourceIds,
        department_ids: departmentIds,
        learning_assets: learningAssetsWithDerivedFrequencies,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? vi.error_generic_short); return }
    router.push(`/documents/${id}`)
  }

  async function handleSaveWithoutAi() {
    await saveDocument()
  }

  async function handleConfirmSave() {
    await saveDocument()
  }

  async function handleRegenerateFlowchart() {
    setRegenerating(true)
    const res = await fetch('/api/documents/flowchart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const data = await res.json()
    setRegenerating(false)
    if (data.mermaid_code) setMermaidCode(data.mermaid_code)
  }

  const showFlowchart = FLOWCHART_TYPES.includes(docType) && mermaidCode

  return (
    <div className="flex h-full min-h-0 flex-col bg-white -m-4 md:-m-6">
      {/* Top bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <Link href={`/documents/${id}`} className="text-gray-400 hover:text-gray-600 shrink-0">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-base font-semibold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-400"
            placeholder="Tiêu đề tài liệu"
          />
          {docCode && <p className="text-xs text-gray-400 font-mono">{docCode}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDocumentInfo(true)}
            className="inline-flex min-h-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <FilePenLine size={15} />
            Thông tin tài liệu
          </button>
          <button
            onClick={() => setShowAi(prev => !prev)}
            className={`inline-flex min-h-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              showAi
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title="Phân tích tài liệu với AI"
          >
            <Sparkles size={15} />
            Phân tích với AI
          </button>
          <button
            onClick={handleSaveWithoutAi}
            disabled={saving || generatingAssets}
            className="btn-secondary text-sm px-3 py-1.5 min-h-0"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Lưu không dùng AI
          </button>
          {learningAssets && (
            <button
              onClick={() => setShowLearningAssetsModal(true)}
              disabled={saving || generatingAssets}
              className="btn-secondary text-sm px-3 py-1.5 min-h-0"
            >
              Chỉnh sửa nội dung AI
            </button>
          )}
          <button
            onClick={handleAiUpdate}
            disabled={saving || generatingAssets}
            className="btn-primary text-sm px-3 py-1.5 min-h-0"
          >
            {generatingAssets ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generatingAssets ? 'Đang cập nhật AI...' : learningAssets ? 'Cập nhật với AI' : 'Tạo với AI'}
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 bg-red-50 text-red-700 text-sm px-4 py-2 border-b border-red-200">{error}</div>
      )}

      {/* Two-panel layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="min-h-0 flex-1 overflow-hidden">
        <IsoDocumentEditor
          value={content}
          onChange={setContent}
          selectedResourceIds={resourceIds}
          onResourceIdsChange={setResourceIds}
          documentId={id}
          flowchartImageUrl={flowchartImagePath ? `/api/documents/${id}/flowchart-image` : null}
          onFlowchartUploaded={setFlowchartImagePath}
        />
          </div>

          {/* Flowchart below editor */}
          {showFlowchart && (
            <div className="shrink-0 border-t border-gray-200 p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sơ đồ quy trình</h3>
                <button
                  onClick={handleRegenerateFlowchart}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                >
                  {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Tạo lại
                </button>
              </div>
              <MermaidChart code={mermaidCode} />
            </div>
          )}
        </div>

        {/* Right: AI Sidebar */}
        {showAi && (
        <div className="fixed inset-0 z-40 flex w-full shrink-0 flex-col border-l border-gray-200 bg-white md:static md:z-auto md:w-[360px]">
          {/* Mobile close */}
          <button
            onClick={() => setShowAi(false)}
            className="md:hidden absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-50"
          >
            <X size={20} />
          </button>
          <AiChatPanel
            content={content}
            docType={docType}
            title={title}
          />
        </div>
        )}
      </div>

      {showLearningAssetsModal && learningAssets && (
        <LearningAssetsReviewModal
          assets={learningAssets}
          recommendedQuizCount={recommendedQuizQuestionsForImportance(processImportanceLevel)}
          saving={saving}
          onChange={setLearningAssets}
          onCancel={() => setShowLearningAssetsModal(false)}
          onConfirm={handleConfirmSave}
        />
      )}

      {showDocumentInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4" onMouseDown={event => {
          if (event.currentTarget === event.target) setShowDocumentInfo(false)
        }}>
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">Thông tin tài liệu</h2>
                <p className="mt-0.5 text-sm text-gray-500">Cấu hình mã, tên, bộ phận chính và bộ phận bắt buộc học.</p>
              </div>
              <button type="button" onClick={() => setShowDocumentInfo(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Mã tài liệu *</label>
                  <input value={docCode} onChange={event => setDocCode(event.target.value.toUpperCase())} className="input font-mono" />
                </div>
                <div>
                  <label className="label">Tên tài liệu *</label>
                  <input value={title} onChange={event => setTitle(event.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Bộ phận chính *</label>
                <select value={mainDepartmentId} onChange={event => setMainDepartmentId(event.target.value)} className="input">
                  <option value="">Chọn bộ phận phụ trách quy trình</option>
                  {departments.map(department => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Bộ phận chịu trách nhiệm chính cho quy trình/tài liệu này.</p>
              </div>
              <div className="max-w-md">
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
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Building2 size={15} className="text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">Bộ phận bắt buộc học</label>
                </div>
                <p className="mb-3 text-xs text-gray-500">Các bộ phận liên quan cần biết và xác nhận học tài liệu này.</p>
                <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 md:grid-cols-2">
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
            </div>
            <div className="flex justify-end border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setShowDocumentInfo(false)} className="btn-primary min-h-0 px-4 py-2 text-sm">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function normalizeLevel(value: unknown): ProcessImportanceLevel {
  const parsed = Number(value)
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5) return parsed
  return 3
}

function ImportanceInfo() {
  const levels: ProcessImportanceLevel[] = [5, 4, 3, 2, 1]
  return (
    <span className="group relative inline-flex">
      <Info size={14} className="text-gray-400" />
      <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-[34rem] rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-xl group-hover:block">
        <span className="mb-2 block font-semibold text-gray-900">Tần suất mặc định theo mức quan trọng</span>
        <span className="grid grid-cols-[1.1fr_0.55fr_0.75fr_0.8fr_0.75fr] gap-2 border-b border-gray-100 pb-1 font-semibold text-gray-700">
          <span>Level</span><span>Quiz</span><span>SOP</span><span>Xác nhận</span><span>Audit</span>
        </span>
        {levels.map(level => {
          const defaults = frequenciesForImportance(level)
          return (
            <span key={level} className="grid grid-cols-[1.1fr_0.55fr_0.75fr_0.8fr_0.75fr] gap-2 border-b border-gray-50 py-1 last:border-0">
              <span><b>{level}</b> - {PROCESS_IMPORTANCE_DESCRIPTIONS[level]}</span>
              <span>{recommendedQuizQuestionsForImportance(level)} câu</span>
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
