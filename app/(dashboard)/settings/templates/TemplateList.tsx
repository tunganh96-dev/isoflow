'use client'

import { useState } from 'react'
import { DOC_TYPE_LABELS } from '@/lib/documents'
import { CheckCircle, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'

interface TemplateItem {
  id: string
  name: string
  doc_type: string
  content: string
  is_active: boolean
}

export default function TemplateList({ templates: initial }: { templates: TemplateItem[] }) {
  const [templates] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<TemplateItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [docType, setDocType] = useState('sop')
  const [content, setContent] = useState('')
  const [isActive, setIsActive] = useState(true)

  function resetForm() {
    setName('')
    setDocType('sop')
    setContent('')
    setIsActive(true)
    setError('')
    setEditing(null)
  }

  function startAdd() {
    resetForm()
    setShowAdd(true)
  }

  function startEdit(template: TemplateItem) {
    setEditing(template)
    setShowAdd(true)
    setName(template.name)
    setDocType(template.doc_type)
    setContent(template.content)
    setIsActive(template.is_active)
    setError('')
  }

  async function saveTemplate() {
    if (!name.trim() || !content.trim()) {
      setError('Vui lòng nhập tên mẫu và nội dung mẫu')
      return
    }

    setSaving(true)
    setError('')
    const path = editing ? `/api/settings/templates/${editing.id}` : '/api/settings/templates'
    const res = await fetch(path, {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, doc_type: docType, content, is_active: isActive }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error ?? 'Không thể lưu mẫu')
      return
    }
    window.location.reload()
  }

  async function deleteTemplate(template: TemplateItem) {
    if (!confirm(`Xóa mẫu "${template.name}"?`)) return
    const res = await fetch(`/api/settings/templates/${template.id}`, { method: 'DELETE' })
    if (res.ok) window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{templates.length} mẫu tài liệu</p>
        <button onClick={startAdd} className="btn-primary text-sm px-3 py-2 min-h-0">
          <Plus size={16} /> Thêm mẫu
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{editing ? 'Sửa mẫu tài liệu' : 'Thêm mẫu tài liệu'}</h3>
            <button onClick={() => { setShowAdd(false); resetForm() }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Tên mẫu *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Mẫu quy trình ISO" />
            </div>
            <div>
              <label className="label">Loại tài liệu *</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} className="input">
                {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
            Dùng mẫu này cho AI
          </label>
          <div>
            <label className="label">Nội dung mẫu *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="input font-mono text-sm"
              rows={16}
              placeholder="Dán ví dụ form/format chuẩn ở đây. Có thể dùng Markdown table, heading, header/footer..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={saveTemplate} disabled={saving} className="btn-primary text-sm px-4 py-2 min-h-0">
            {saving && <Loader2 size={14} className="animate-spin" />} Lưu mẫu
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Mẫu</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Loại</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Trạng thái</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{template.name}</p>
                  <p className="text-xs text-gray-400 truncate max-w-md">{template.content}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{DOC_TYPE_LABELS[template.doc_type] ?? template.doc_type}</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {template.is_active && <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle size={13} /> Đang dùng</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(template)} className="text-gray-400 hover:text-gray-600"><Pencil size={14} /></button>
                    <button onClick={() => deleteTemplate(template)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
