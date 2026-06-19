'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, ImagePlus, Loader2 } from 'lucide-react'
import DocumentEditor from './DocumentEditor'
import RelatedResourcePicker from './RelatedResourcePicker'
import type { DocumentResource } from './ResourceUploadForm'
import { composeIsoDocument, ISO_SECTIONS, splitIsoDocument } from '@/lib/iso-document-sections'

export default function IsoDocumentEditor({
  value,
  onChange,
  selectedResourceIds,
  onResourceIdsChange,
  documentId,
  flowchartImageUrl,
  onFlowchartUploaded,
}: {
  value: string
  onChange: (value: string) => void
  selectedResourceIds: string[]
  onResourceIdsChange: (ids: string[]) => void
  documentId: string
  flowchartImageUrl: string | null
  onFlowchartUploaded: (path: string | null) => void
}) {
  const [activeSection, setActiveSection] = useState(1)
  const [sections, setSections] = useState(() => splitIsoDocument(value))
  const [resources, setResources] = useState<DocumentResource[]>([])
  const [uploadingFlowchart, setUploadingFlowchart] = useState(false)
  const [flowchartError, setFlowchartError] = useState('')

  useEffect(() => {
    fetch('/api/document-resources')
      .then(response => response.json())
      .then(data => setResources(data.resources ?? []))
  }, [])

  const selectedResources = useMemo(
    () => resources.filter(resource => selectedResourceIds.includes(resource.id)),
    [resources, selectedResourceIds]
  )

  useEffect(() => {
    onChange(composeIsoDocument(sections, selectedResources))
  }, [sections, selectedResources]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = ISO_SECTIONS.find(section => section.number === activeSection)!

  return (
    <div className="flex h-full min-h-0 bg-white">
      <nav className="w-[220px] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-2">
        <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase text-gray-400">Cấu trúc tài liệu ISO</p>
        {ISO_SECTIONS.map(section => (
          <button
            key={section.number}
            type="button"
            onClick={() => setActiveSection(section.number)}
            className={`mb-1 flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
              activeSection === section.number
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'text-gray-600 hover:bg-white hover:text-gray-900'
            }`}
          >
            <span className="w-5 shrink-0 font-mono text-xs">{section.number}.</span>
            <span>{titleCase(section.title)}</span>
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">{current.number}. {titleCase(current.title)}</h2>
          {current.number === 6 && (
            <p className="mt-1 text-xs text-gray-500">6.1 Lưu đồ sẽ hiển thị ảnh lưu đồ A4; phần nội dung bên dưới là mô tả quy trình.</p>
          )}
          {current.number === 7 && (
            <p className="mt-1 text-xs text-gray-500">Bảng này được tạo tự động từ biểu mẫu và tài liệu liên kết với quy trình.</p>
          )}
        </div>

        {current.number === 7 ? (
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <RelatedResourcePicker
              selectedIds={selectedResourceIds}
              onChange={onResourceIdsChange}
              onResourceUploaded={resource => setResources(current => (
                current.some(item => item.id === resource.id) ? current : [...current, resource]
              ))}
            />
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText size={15} />
                Bảng lưu trữ hồ sơ
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">TT</th>
                      <th className="px-3 py-2 font-medium">Mã tài liệu</th>
                      <th className="px-3 py-2 font-medium">Tên tài liệu</th>
                      <th className="px-3 py-2 font-medium">Bộ phận lưu</th>
                      <th className="px-3 py-2 font-medium">Cập nhật</th>
                      <th className="px-3 py-2 font-medium">Thời gian lưu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResources.length ? selectedResources.map((resource, index) => (
                      <tr key={resource.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs text-blue-700">{resource.resource_code}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{resource.name}</td>
                        <td className="px-3 py-2 text-gray-600">{resource.department?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{formatDate(resource.updated_at ?? resource.created_at)}</td>
                        <td className="px-3 py-2 text-gray-600">{resource.retention_period ?? '—'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">Chưa liên kết hồ sơ hoặc biểu mẫu.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : current.number === 6 ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-gray-100 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">6.1 Lưu đồ</h3>
                  <p className="text-xs text-gray-500">Tải ảnh PNG/JPG đã căn vừa trang A4. Ảnh này sẽ xuất hiện trong PDF và Word.</p>
                </div>
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  {uploadingFlowchart ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                  {flowchartImageUrl ? 'Thay ảnh lưu đồ' : 'Thêm ảnh lưu đồ'}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={event => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) uploadFlowchart(file)
                  }} />
                </label>
              </div>
              {flowchartError && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{flowchartError}</p>}
              {flowchartImageUrl ? (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <img src={`${flowchartImageUrl}?v=${Date.now()}`} alt="Lưu đồ quy trình" className="mx-auto max-h-[38dvh] w-auto object-contain" />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                  Chưa có ảnh lưu đồ.
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1">
              <DocumentEditor
                value={sections[current.number] ?? ''}
                onChange={sectionValue => setSections(currentSections => ({ ...currentSections, [current.number]: sectionValue }))}
                minHeight={500}
              />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <DocumentEditor
              value={sections[current.number] ?? ''}
              onChange={sectionValue => setSections(currentSections => ({ ...currentSections, [current.number]: sectionValue }))}
              minHeight={500}
            />
          </div>
        )}
      </div>
    </div>
  )

  async function uploadFlowchart(file: File) {
    setUploadingFlowchart(true)
    setFlowchartError('')
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`/api/documents/${documentId}/flowchart-image`, { method: 'POST', body: formData })
    const data = await response.json()
    setUploadingFlowchart(false)
    if (!response.ok) {
      setFlowchartError(data.error ?? 'Không thể tải ảnh lưu đồ')
      return
    }
    onFlowchartUploaded(data.path ?? null)
  }
}

function titleCase(value: string) {
  return value
    .toLocaleLowerCase('vi-VN')
    .split(' ')
    .map(word => word ? `${word[0].toLocaleUpperCase('vi-VN')}${word.slice(1)}` : word)
    .join(' ')
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '—'
}
