'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FLOWCHART_TYPES } from '@/lib/documents'
import { ChevronLeft, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const DocumentEditor = dynamic(() => import('@/components/DocumentEditor'), { ssr: false })
const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })

export default function EditDocumentPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mermaidCode, setMermaidCode] = useState('')
  const [docType, setDocType] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.document) {
          setTitle(data.document.title)
          setContent(data.document.content)
          setMermaidCode(data.document.mermaid_code ?? '')
          setDocType(data.document.doc_type)
        }
        setLoading(false)
      })
  }, [id])

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, mermaid_code: mermaidCode || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Đã xảy ra lỗi'); return }
    router.push(`/documents/${id}`)
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

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Đang tải...</div>

  const showFlowchart = FLOWCHART_TYPES.includes(docType)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/documents/${id}`} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Chỉnh sửa tài liệu</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
        <DocumentEditor value={content} onChange={setContent} minHeight={500} />
      </div>

      {showFlowchart && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Sơ đồ quy trình</h3>
            <button
              onClick={handleRegenerateFlowchart}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Tạo lại
            </button>
          </div>
          {mermaidCode && <MermaidChart code={mermaidCode} />}
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href={`/documents/${id}`} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Hủy
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Lưu thay đổi
        </button>
      </div>
    </div>
  )
}
