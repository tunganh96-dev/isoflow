'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, FileText } from 'lucide-react'
import ResourceUploadForm, { DocumentResource, RESOURCE_TYPE_LABELS } from './ResourceUploadForm'

export default function ResourceLibrary({
  resources,
  initialShowUpload = false,
}: {
  resources: DocumentResource[]
  initialShowUpload?: boolean
}) {
  const router = useRouter()
  const [showUpload, setShowUpload] = useState(initialShowUpload)

  useEffect(() => {
    setShowUpload(initialShowUpload)
  }, [initialShowUpload])

  function closeUpload() {
    setShowUpload(false)
    router.replace('/documents?view=resources', { scroll: false })
  }

  return (
    <div>
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4"
          onMouseDown={event => {
            if (event.currentTarget === event.target) closeUpload()
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <ResourceUploadForm
              onCancel={closeUpload}
              onUploaded={() => {
                closeUpload()
                router.refresh()
              }}
            />
          </div>
        </div>
      )}

      {!resources.length ? (
        <div className="flex min-h-[calc(100dvh-20rem)] flex-col items-center justify-center text-gray-400">
          <FileText size={38} className="mb-3 opacity-30" />
          <p className="text-sm">Chưa có biểu mẫu hoặc tài liệu hỗ trợ</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Mã</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Tên tài liệu</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Loại</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Bộ phận</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Thông tin</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Thời gian lưu</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Người tải lên</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">Ngày tải lên</th>
                <th className="w-14" />
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => (
                <tr
                  key={resource.id}
                  onClick={() => window.open(`/api/document-resources/${resource.id}/download`, '_blank')}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-700">{resource.resource_code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{resource.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{resource.file_name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{RESOURCE_TYPE_LABELS[resource.resource_type] ?? resource.resource_type}</td>
                  <td className="px-4 py-3 text-gray-600">{resource.department?.name ?? '—'}</td>
                  <td className="max-w-xs px-4 py-3 text-gray-600">
                    <p className="line-clamp-2">{resource.description}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{resource.retention_period ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{resource.uploader?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(resource.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <a onClick={event => event.stopPropagation()} href={`/api/document-resources/${resource.id}/download`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600" title="Tải file">
                      <Download size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
