'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus, Search, X } from 'lucide-react'
import ResourceUploadForm, { DocumentResource, RESOURCE_TYPE_LABELS } from './ResourceUploadForm'

export default function RelatedResourcePicker({
  selectedIds,
  onChange,
  onResourceUploaded,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onResourceUploaded?: (resource: DocumentResource) => void
}) {
  const [resources, setResources] = useState<DocumentResource[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showSelect, setShowSelect] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/document-resources')
      .then(response => response.json())
      .then(data => setResources(data.resources ?? []))
  }, [])

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter(item => item !== id) : [...selectedIds, id])
  }

  const selectedResources = resources.filter(resource => selectedIds.includes(resource.id))
  const filteredResources = resources.filter(resource => {
    const text = `${resource.resource_code} ${resource.name} ${resource.description}`.toLowerCase()
    return text.includes(search.trim().toLowerCase())
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="label">Biểu mẫu & tài liệu liên quan</label>
          <p className="text-xs text-gray-400">Chọn file đã có hoặc tải file mới. Các file sẽ được lưu trong thư viện dùng chung.</p>
        </div>
        {selectedIds.length > 0 && <span className="text-xs font-medium text-blue-600">{selectedIds.length} đã chọn</span>}
      </div>

      <div className="flex h-[min(34dvh,20rem)] min-h-60 flex-col rounded-lg border border-gray-200 p-2">
        <div className="grid gap-2 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setShowSelect(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <FileText size={15} />
            Chọn tài liệu sẵn có
          </button>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus size={15} />
            Tải tài liệu mới
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {selectedResources.length ? (
            <div className="space-y-1">
              {selectedResources.map(resource => (
                <div key={resource.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm">
                  <FileText size={14} className="mt-0.5 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{resource.resource_code} · {resource.name}</p>
                    <p className="truncate text-xs text-gray-400">{RESOURCE_TYPE_LABELS[resource.resource_type]}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Chưa chọn tài liệu liên quan
            </div>
          )}
        </div>
      </div>

      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4"
          onMouseDown={event => {
            if (event.currentTarget === event.target) setShowUpload(false)
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <ResourceUploadForm
              onCancel={() => setShowUpload(false)}
              onUploaded={resource => {
                setResources(current => [...current, resource].sort((a, b) => a.resource_code.localeCompare(b.resource_code)))
                onChange([...selectedIds, resource.id])
                onResourceUploaded?.(resource)
                setShowUpload(false)
              }}
            />
          </div>
        </div>
      )}

      {showSelect && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4"
          onMouseDown={event => {
            if (event.currentTarget === event.target) setShowSelect(false)
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">Chọn biểu mẫu & tài liệu</h2>
                <p className="mt-0.5 text-sm text-gray-500">Chọn một hoặc nhiều tài liệu đã có trong hệ thống.</p>
              </div>
              <button type="button" onClick={() => setShowSelect(false)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <Search size={15} className="text-gray-400" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="w-full border-none bg-transparent text-sm outline-none placeholder:text-gray-400"
                  placeholder="Tìm theo mã, tên hoặc thông tin..."
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[55dvh] overflow-y-auto p-3">
              {!filteredResources.length ? (
                <p className="px-2 py-8 text-center text-sm text-gray-400">Không tìm thấy tài liệu.</p>
              ) : filteredResources.map(resource => (
                <label key={resource.id} className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 hover:bg-gray-50">
                  <input type="checkbox" checked={selectedIds.includes(resource.id)} onChange={() => toggle(resource.id)} className="mt-1 accent-blue-600" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{resource.resource_code} · {resource.name}</span>
                    <span className="block text-xs text-gray-400">{RESOURCE_TYPE_LABELS[resource.resource_type]} · {resource.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
              <span className="text-sm text-gray-500">{selectedIds.length} tài liệu đã chọn</span>
              <button type="button" onClick={() => setShowSelect(false)} className="btn-primary min-h-0 px-4 py-2 text-sm">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
