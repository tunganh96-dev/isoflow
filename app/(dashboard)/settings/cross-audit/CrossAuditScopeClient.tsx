'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'

type Factory = { id: string; name: string; code: string }
type Department = { id: string; name: string; code: string; factory_id: string }
type Doc = { id: string; doc_code: string; title: string; department_id: string; document_assignments: { department_id: string }[] }
type ScopeRow = { id: string; factory_id: string; department_id: string; document_id: string }

export default function CrossAuditScopeClient({ factories, departments, documents, initialScope }: {
  factories: Factory[]
  departments: Department[]
  documents: Doc[]
  initialScope: ScopeRow[]
}) {
  const [selectedFactory, setSelectedFactory] = useState(factories[0]?.id ?? '')
  const [selectedDept, setSelectedDept] = useState('')
  const [scope, setScope] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {}
    initialScope.forEach(row => {
      const key = row.department_id
      if (!map[key]) map[key] = new Set()
      map[key].add(row.document_id)
    })
    return map
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const factoryDepts = departments.filter(d => d.factory_id === selectedFactory)
  const activeDept = factoryDepts.find(d => d.id === selectedDept)

  // Documents relevant to the selected department
  const relevantDocs = activeDept
    ? documents.filter(doc =>
      doc.department_id === activeDept.id
      || (doc.document_assignments ?? []).some(a => a.department_id === activeDept.id)
    )
    : []

  const selectedDocIds = scope[selectedDept] ?? new Set()

  function toggleDoc(docId: string) {
    setScope(prev => {
      const current = new Set(prev[selectedDept] ?? [])
      if (current.has(docId)) current.delete(docId)
      else current.add(docId)
      return { ...prev, [selectedDept]: current }
    })
  }

  function selectAll() {
    setScope(prev => ({
      ...prev,
      [selectedDept]: new Set(relevantDocs.map(d => d.id)),
    }))
  }

  function deselectAll() {
    setScope(prev => ({
      ...prev,
      [selectedDept]: new Set(),
    }))
  }

  async function save() {
    if (!selectedFactory || !selectedDept) return
    setSaving(true); setMessage('')
    const res = await fetch('/api/cross-audit/scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factory_id: selectedFactory,
        department_id: selectedDept,
        document_ids: Array.from(selectedDocIds),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      setMessage((await res.json()).error ?? 'Lỗi lưu')
      return
    }
    setMessage(`Đã lưu ${selectedDocIds.size} quy trình cho ${activeDept?.name}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Phạm vi kiểm tra chéo</h2>
        <p className="mt-1 text-xs text-gray-500">Chọn quy trình nào của mỗi bộ phận sẽ được kiểm tra chéo hàng tháng.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Department list */}
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <select value={selectedFactory} onChange={e => { setSelectedFactory(e.target.value); setSelectedDept('') }} className="input mb-3 text-sm">
            {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <div className="space-y-1">
            {factoryDepts.map(dept => {
              const selected = scope[dept.id]?.size ?? 0
              const total = documents.filter(doc =>
                doc.department_id === dept.id
                || (doc.document_assignments ?? []).some(a => a.department_id === dept.id)
              ).length
              return (
                <button
                  key={dept.id}
                  onClick={() => { setSelectedDept(dept.id); setMessage('') }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedDept === dept.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{dept.name}</span>
                  <span className="text-xs text-gray-400">{selected}/{total} quy trình</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Process selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {activeDept ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Quy trình của {activeDept.name}</h3>
                  <p className="text-xs text-gray-500">{selectedDocIds.size}/{relevantDocs.length} đã chọn</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs font-medium text-blue-600 hover:underline">Chọn tất cả</button>
                  <button onClick={deselectAll} className="text-xs font-medium text-gray-500 hover:underline">Bỏ chọn</button>
                  <button onClick={save} disabled={saving} className="btn-primary min-h-0 px-3 py-1.5 text-sm">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
                  </button>
                </div>
              </div>
              {message && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
              {relevantDocs.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Bộ phận này chưa có quy trình nào.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {relevantDocs.map(doc => (
                    <label key={doc.id} className="flex items-start gap-3 py-2.5 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.has(doc.id)}
                        onChange={() => toggleDoc(doc.id)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          <span className="font-mono text-xs text-blue-700">{doc.doc_code}</span> {doc.title}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">Chọn một bộ phận để cấu hình phạm vi kiểm tra.</p>
          )}
        </div>
      </div>
    </div>
  )
}
