'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'

interface Dept {
  id: string
  name: string
  code: string
  factory_id: string
  exclude_from_cross_audit: boolean
  factories: { name: string } | null
}

interface Props {
  departments: Dept[]
}

export default function DepartmentList({ departments: initial }: Props) {
  const departments = initial
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Add form
  const [addName, setAddName] = useState('')
  const [addCode, setAddCode] = useState('')
  const [addExclude, setAddExclude] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit form
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editExclude, setEditExclude] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function handleAdd() {
    if (!addName || !addCode) { setAddError('Vui lòng điền đầy đủ'); return }
    setAdding(true)
    setAddError('')
    const res = await fetch('/api/settings/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName, code: addCode, exclude_from_cross_audit: addExclude }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setAddError(data.error ?? 'Lỗi'); return }
    window.location.reload()
  }

  function startEdit(d: Dept) {
    setEditingId(d.id)
    setEditName(d.name)
    setEditCode(d.code)
    setEditExclude(d.exclude_from_cross_audit)
    setEditError('')
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setSaving(true)
    setEditError('')
    const res = await fetch(`/api/settings/departments/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, code: editCode, exclude_from_cross_audit: editExclude }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setEditError(data.error ?? 'Lỗi'); return }
    window.location.reload()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa bộ phận "${name}"? Hành động này không thể hoàn tác.`)) return
    const res = await fetch(`/api/settings/departments/${id}`, { method: 'DELETE' })
    if (res.ok) window.location.reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{departments.length} bộ phận</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingId(null) }} className="btn-primary text-sm px-3 py-2 min-h-0">
          <Plus size={16} /> Thêm bộ phận
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Thêm bộ phận mới</h3>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Tên bộ phận *</label>
              <input value={addName} onChange={e => setAddName(e.target.value)} className="input" placeholder="Sản xuất Converting" />
            </div>
            <div>
              <label className="label">Mã *</label>
              <input value={addCode} onChange={e => setAddCode(e.target.value)} className="input" placeholder="SC" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={addExclude} onChange={e => setAddExclude(e.target.checked)} className="rounded" />
            Không tham gia kiểm toán chéo
          </label>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button onClick={handleAdd} disabled={adding} className="btn-primary text-sm px-4 py-2 min-h-0">
            {adding && <Loader2 size={14} className="animate-spin" />} Thêm
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Bộ phận</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Mã</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ghi chú</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id} className="border-b border-gray-100 last:border-0">
                  {editingId === d.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="input text-sm py-1" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editCode} onChange={e => setEditCode(e.target.value)} className="input text-sm py-1 w-20" />
                      </td>
                      <td className="px-4 py-2">
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input type="checkbox" checked={editExclude} onChange={e => setEditExclude(e.target.checked)} className="rounded" />
                          Không kiểm toán chéo
                        </label>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={handleSaveEdit} disabled={saving} className="text-blue-600 text-xs font-medium">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Lưu'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 text-xs">Hủy</button>
                        </div>
                        {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-2.5 font-mono text-gray-500">{d.code}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">
                        {d.exclude_from_cross_audit && 'Không kiểm toán chéo'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(d)} className="text-gray-400 hover:text-gray-600"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(d.id, d.name)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
