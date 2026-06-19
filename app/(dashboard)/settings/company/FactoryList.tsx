'use client'

import { useState } from 'react'
import { Plus, Pencil, X, Loader2, Factory } from 'lucide-react'

interface FactoryItem {
  id: string
  name: string
  code: string
  created_at: string
}

export default function FactoryList({ factories: initial }: { factories: FactoryItem[] }) {
  const factories = initial
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [addName, setAddName] = useState('')
  const [addCode, setAddCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function handleAdd() {
    if (!addName || !addCode) { setAddError('Vui lòng điền đầy đủ'); return }
    setAdding(true)
    setAddError('')
    const res = await fetch('/api/settings/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName, code: addCode.toUpperCase() }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setAddError(data.error ?? 'Lỗi'); return }
    window.location.reload()
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setSaving(true)
    setEditError('')
    const res = await fetch(`/api/settings/company/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, code: editCode.toUpperCase() }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setEditError(data.error ?? 'Lỗi'); return }
    window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{factories.length} nhà máy</p>
        <button onClick={() => { setShowAdd(true); setEditingId(null) }} className="btn-primary text-sm px-3 py-2 min-h-0">
          <Plus size={16} /> Thêm nhà máy
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Thêm nhà máy mới</h3>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tên nhà máy *</label>
              <input value={addName} onChange={e => setAddName(e.target.value)} className="input" placeholder="Long An" />
            </div>
            <div>
              <label className="label">Mã nhà máy *</label>
              <input value={addCode} onChange={e => setAddCode(e.target.value)} className="input" placeholder="LA" />
            </div>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button onClick={handleAdd} disabled={adding} className="btn-primary text-sm px-4 py-2 min-h-0">
            {adding && <Loader2 size={14} className="animate-spin" />} Thêm
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {factories.map(f => (
          <div key={f.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            {editingId === f.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tên</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Mã</label>
                    <input value={editCode} onChange={e => setEditCode(e.target.value)} className="input" />
                  </div>
                </div>
                {editError && <p className="text-sm text-red-600">{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} disabled={saving} className="btn-primary text-sm px-3 py-1.5 min-h-0">
                    {saving && <Loader2 size={14} className="animate-spin" />} Lưu
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary text-sm px-3 py-1.5 min-h-0">Hủy</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Factory size={18} className="text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{f.name}</p>
                    <p className="text-xs font-mono text-gray-400">{f.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setEditingId(f.id); setEditName(f.name); setEditCode(f.code); setEditError('') }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
