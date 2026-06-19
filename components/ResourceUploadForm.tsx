'use client'

import { useEffect, useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface DocumentResource {
  id: string
  resource_code: string
  name: string
  description: string
  resource_type: string
  retention_period?: string | null
  department_id?: string | null
  department?: { id: string; name: string } | null
  file_name: string
  mime_type?: string | null
  file_size?: number | null
  created_at: string
  updated_at?: string | null
  uploader?: { full_name: string } | null
}

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  form: 'Biểu mẫu',
  record: 'Hồ sơ',
  reference: 'Tài liệu tham khảo',
  other: 'Khác',
}

export default function ResourceUploadForm({
  onUploaded,
  onCancel,
}: {
  onUploaded: (resource: DocumentResource) => void
  onCancel?: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [resourceType, setResourceType] = useState('form')
  const [departmentId, setDepartmentId] = useState('')
  const [retentionPeriod, setRetentionPeriod] = useState('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('departments')
      .select('id, name')
      .order('name')
      .then(({ data }) => setDepartments(data ?? []))
  }, [])

  async function upload() {
    if (!code.trim() || !name.trim() || !description.trim() || !departmentId || !retentionPeriod.trim() || !file) {
      setError('Vui lòng nhập đầy đủ thông tin và chọn file')
      return
    }

    setSaving(true)
    setError('')
    const formData = new FormData()
    formData.append('resource_code', code)
    formData.append('name', name)
    formData.append('description', description)
    formData.append('resource_type', resourceType)
    formData.append('department_id', departmentId)
    formData.append('retention_period', retentionPeriod)
    formData.append('file', file)

    const response = await fetch('/api/document-resources', { method: 'POST', body: formData })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) {
      setError(data.error ?? 'Không thể tải tài liệu lên')
      return
    }

    onUploaded(data.resource)
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Tải tài liệu mới</h3>
          <p className="mt-0.5 text-sm text-gray-500">Nhập thông tin tài liệu và chọn file để lưu vào thư viện.</p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Đóng">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Mã tài liệu *</label>
          <input value={code} onChange={event => setCode(event.target.value.toUpperCase())} className="input font-mono" placeholder="BM.01-QT.09-QA" />
        </div>
        <div>
          <label className="label">Tên tài liệu *</label>
          <input value={name} onChange={event => setName(event.target.value)} className="input" placeholder="Bảng đánh giá rủi ro" />
        </div>
        <div>
          <label className="label">Loại *</label>
          <select value={resourceType} onChange={event => setResourceType(event.target.value)} className="input">
            {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bộ phận *</label>
          <select value={departmentId} onChange={event => setDepartmentId(event.target.value)} className="input">
            <option value="">Chọn bộ phận</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Thời gian lưu *</label>
          <input value={retentionPeriod} onChange={event => setRetentionPeriod(event.target.value)} className="input" placeholder="Vd: 02 năm" />
        </div>
      </div>
      <div>
        <label className="label">Thông tin / mục đích sử dụng *</label>
        <textarea value={description} onChange={event => setDescription(event.target.value)} className="input" rows={2} placeholder="Tài liệu này được dùng khi nào và để ghi nhận thông tin gì?" />
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <label className="label">File *</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png"
          onChange={event => setFile(event.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
        )}
        <button type="button" onClick={upload} disabled={saving} className="btn-primary min-h-0 px-4 py-2 text-sm">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {saving ? 'Đang tải lên...' : 'Tải file lên'}
        </button>
      </div>
    </div>
  )
}
