'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ISO_CLAUSES, SEVERITY_LABELS } from '@/lib/ncr'
import { vi } from '@/lib/i18n/vi'

export default function NewNcrPage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [description, setDescription] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [isoClause, setIsoClause] = useState('')
  const [severity, setSeverity] = useState<'minor' | 'major' | 'critical'>('minor')
  const [reporterName, setReporterName] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    createClient()
      .from('departments')
      .select('id, name')
      .then(({ data }) => { if (data) setDepartments(data) })
  }, [])

  async function uploadPhotos(): Promise<string[]> {
    if (photos.length === 0) return []
    const urls: string[] = []
    for (const file of photos) {
      const formData = new FormData()
      formData.set('type', 'photo')
      formData.set('file', file)
      const response = await fetch('/api/ncr/uploads', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Không thể tải ảnh lên')
      urls.push(data.path)
    }
    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!description.trim()) { setError('Vui lòng mô tả sự không phù hợp'); return }
    if (!departmentId) { setError('Vui lòng chọn bộ phận'); return }
    if (['major', 'critical'].includes(severity) && photos.length === 0) {
      setError('Vấn đề mức độ lớn/nghiêm trọng phải có ảnh bằng chứng')
      return
    }

    try {
      setUploading(true)
      const photo_urls = await uploadPhotos()
      setUploading(false)
      setSaving(true)

      const res = await fetch('/api/ncr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, department_id: departmentId, iso_clause: isoClause || null, severity, reporter_name: reporterName || null, photo_urls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? vi.error_generic_short)
      router.push('/ncr')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : vi.error_generic_short)
    } finally {
      setUploading(false)
      setSaving(false)
    }
  }

  const loading = uploading || saving

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ncr" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Tạo vấn đề mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả sự không phù hợp *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả chi tiết sự không phù hợp đã phát hiện..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận xảy ra *</label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn bộ phận --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ nghiêm trọng *</label>
              <div className="flex gap-2">
                {(['minor', 'major', 'critical'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      severity === s
                        ? s === 'minor' ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                          : s === 'major' ? 'bg-orange-100 border-orange-400 text-orange-800'
                          : 'bg-red-100 border-red-400 text-red-800'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {SEVERITY_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Điều khoản ISO liên quan</label>
              <select
                value={isoClause}
                onChange={e => setIsoClause(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn điều khoản --</option>
                {ISO_CLAUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Người phát hiện</label>
              <input
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Họ tên người phát hiện"
              />
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ảnh bằng chứng {['major', 'critical'].includes(severity) && <span className="text-red-500">*</span>}
            </label>
            <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 hover:border-blue-400 transition-colors">
              <Upload size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                {photos.length > 0 ? `${photos.length} ảnh đã chọn` : 'Chọn ảnh (JPG, PNG)'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => setPhotos(Array.from(e.target.files ?? []))}
              />
            </label>
            {photos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {photos.map((f, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{f.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/ncr" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Hủy</Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {uploading ? 'Đang tải ảnh...' : saving ? 'Đang lưu...' : 'Tạo vấn đề'}
          </button>
        </div>
      </form>
    </div>
  )
}
