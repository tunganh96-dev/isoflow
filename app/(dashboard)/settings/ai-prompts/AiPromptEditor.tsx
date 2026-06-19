'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'

interface AiPrompt {
  id?: string
  key: string
  name: string
  description: string | null
  content: string
  is_active: boolean
}

const PROMPT_KEY_OPTIONS = [
  { value: 'process_analysis', label: 'Phân tích quy trình' },
  { value: 'document_learning_assets', label: 'Summary / Quiz / Audit' },
  { value: 'ncr_document', label: 'Tạo NCR document' },
]

export default function AiPromptEditor({ prompts: initialPrompts }: { prompts: AiPrompt[] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AiPrompt | null>(null)
  const [keyValue, setKeyValue] = useState('process_analysis')
  const [customKey, setCustomKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setEditing(null)
    setKeyValue('process_analysis')
    setCustomKey('')
    setName('')
    setDescription('')
    setContent('')
    setIsActive(true)
    setError('')
  }

  function startAdd() {
    resetForm()
    setShowForm(true)
  }

  function startEdit(prompt: AiPrompt) {
    setEditing(prompt)
    setShowForm(true)
    setKeyValue(PROMPT_KEY_OPTIONS.some(option => option.value === prompt.key) ? prompt.key : 'custom')
    setCustomKey(PROMPT_KEY_OPTIONS.some(option => option.value === prompt.key) ? '' : prompt.key)
    setName(prompt.name)
    setDescription(prompt.description ?? '')
    setContent(prompt.content)
    setIsActive(prompt.is_active)
    setError('')
  }

  async function savePrompt() {
    const finalKey = keyValue === 'custom' ? customKey.trim() : keyValue
    if (!finalKey || !name.trim() || !content.trim()) {
      setError('Vui lòng nhập key, tên prompt và nội dung prompt')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch(editing?.id ? `/api/settings/ai-prompts/${editing.id}` : '/api/settings/ai-prompts', {
      method: editing?.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: finalKey,
        name,
        description,
        content,
        is_active: isActive,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Không thể lưu prompt')
      return
    }

    window.location.reload()
  }

  async function deletePrompt(prompt: AiPrompt) {
    if (!prompt.id) return
    if (!confirm(`Xóa prompt "${prompt.name}"?`)) return
    const res = await fetch(`/api/settings/ai-prompts/${prompt.id}`, { method: 'DELETE' })
    if (res.ok) window.location.reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Prompt AI</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý prompt AI dùng cho phân tích quy trình, summary/audit, NCR và các tác vụ sau này.</p>
        </div>
        <button onClick={startAdd} className="btn-primary text-sm">
          <Plus size={15} />
          Thêm prompt
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">{editing ? 'Sửa prompt' : 'Thêm prompt'}</h2>
            <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <label className="label">Loại prompt / key *</label>
              <select value={keyValue} onChange={e => setKeyValue(e.target.value)} className="input" disabled={Boolean(editing?.id)}>
                {PROMPT_KEY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                <option value="custom">Custom key</option>
              </select>
            </div>
            <div>
              <label className="label">Tên prompt *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Phân tích quy trình" />
            </div>
          </div>

          {keyValue === 'custom' && (
            <div className="mt-3">
              <label className="label">Custom key *</label>
              <input value={customKey} onChange={e => setCustomKey(e.target.value)} className="input font-mono" placeholder="custom_prompt_key" disabled={Boolean(editing?.id)} />
            </div>
          )}

          <div className="mt-3">
            <label className="label">Mô tả</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="Prompt này dùng để..." />
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Đang dùng
          </label>

          <div className="mt-3">
            <label className="label">Nội dung prompt *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={22} className="input font-mono text-sm leading-6" />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button onClick={savePrompt} disabled={saving} className="btn-primary mt-4 text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Lưu prompt
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Tên prompt</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Key</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Mô tả</th>
              <th className="px-4 py-2.5 text-left font-medium text-gray-600">Trạng thái</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {initialPrompts.map(prompt => (
              <tr key={prompt.key} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{prompt.name}</p>
                  <p className="max-w-md truncate text-xs text-gray-400">{prompt.content}</p>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{prompt.key}</td>
                <td className="px-4 py-2.5 text-gray-500">{prompt.description ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">
                  {prompt.is_active && <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle size={13} /> Đang dùng</span>}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(prompt)} className="text-gray-400 hover:text-gray-600"><Pencil size={14} /></button>
                    {prompt.id && <button onClick={() => deletePrompt(prompt)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
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
