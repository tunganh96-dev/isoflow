'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { DOC_TYPE_LABELS, FLOWCHART_TYPES } from '@/lib/documents'
import { Sparkles, Upload, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const DocumentEditor = dynamic(() => import('@/components/DocumentEditor'), { ssr: false })
const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })

type Tab = 'ai' | 'import'

export default function NewDocumentPage() {
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('ai')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('sop')
  const [factoryId, setFactoryId] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [mermaidCode, setMermaidCode] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)

  const [generating, setGenerating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [factories, setFactories] = useState<{ id: string; name: string; code: string }[]>([])

  // Load factories on mount
  useState(() => {
    createClient()
      .from('factories')
      .select('id, name, code')
      .then(({ data }) => { if (data) setFactories(data) })
  })

  async function handleGenerate() {
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề tài liệu'); return }
    setError('')
    setGenerating(true)

    const factory = factories.find(f => f.id === factoryId)
    const res = await fetch('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, doc_type: docType, description, factory_name: factory?.name }),
    })
    const data = await res.json()
    setGenerating(false)

    if (!res.ok) { setError(data.error ?? 'Đã xảy ra lỗi'); return }
    setContent(data.content)
    if (data.mermaid_code) setMermaidCode(data.mermaid_code)
  }

  async function handleImport() {
    if (!importFile) { setError('Vui lòng chọn file'); return }
    setError('')
    setImporting(true)

    const formData = new FormData()
    formData.append('file', importFile)

    const res = await fetch('/api/documents/import', { method: 'POST', body: formData })
    const data = await res.json()
    setImporting(false)

    if (!res.ok) { setError(data.error ?? 'Đã xảy ra lỗi'); return }
    setContent(data.content)
    if (data.mermaid_code) setMermaidCode(data.mermaid_code)
  }

  async function handleRegenerateFlowchart() {
    if (!content) return
    setGenerating(true)
    const res = await fetch('/api/documents/flowchart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const data = await res.json()
    setGenerating(false)
    if (data.mermaid_code) setMermaidCode(data.mermaid_code)
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) { setError('Vui lòng nhập tiêu đề và nội dung'); return }
    setError('')
    setSaving(true)

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        doc_type: docType,
        content,
        mermaid_code: mermaidCode || null,
        factory_id: factoryId || null,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? 'Đã xảy ra lỗi'); return }
    router.push(`/documents/${data.document.id}`)
  }

  const showFlowchart = FLOWCHART_TYPES.includes(docType) && mermaidCode

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/documents" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Tạo tài liệu mới</h1>
      </div>

      {/* Metadata form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề tài liệu *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Vd: Quy trình kiểm soát chất lượng đầu vào"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại tài liệu *</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhà máy</label>
            <select
              value={factoryId}
              onChange={e => setFactoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tài liệu gốc (áp dụng tất cả)</option>
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả ngắn</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả nội dung để AI tạo chính xác hơn"
            />
          </div>
        </div>
      </div>

      {/* Tabs: AI generate vs Import */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'ai' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sparkles size={15} />
            Tạo bằng AI
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'import' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload size={15} />
            Nhập từ file
          </button>
        </div>

        {tab === 'ai' ? (
          <button
            onClick={handleGenerate}
            disabled={generating || !title.trim()}
            className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generating ? 'Đang tạo nội dung...' : 'Tạo bằng AI'}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={e => setImportFile(e.target.files?.[0] ?? null)}
              className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
            />
            <button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {importing ? 'Đang đọc file...' : 'Nhập file'}
            </button>
          </div>
        )}
      </div>

      {/* Editor */}
      {content !== '' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung tài liệu</label>
          <DocumentEditor value={content} onChange={setContent} minHeight={500} />
        </div>
      )}

      {/* Mermaid flowchart */}
      {showFlowchart && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Sơ đồ quy trình</h3>
            <button
              onClick={handleRegenerateFlowchart}
              disabled={generating}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {generating ? 'Đang tạo...' : 'Tạo lại sơ đồ'}
            </button>
          </div>
          <MermaidChart code={mermaidCode} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/documents" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Hủy
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Lưu bản nháp
        </button>
      </div>
    </div>
  )
}
