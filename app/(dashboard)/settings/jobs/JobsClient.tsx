'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'

type Department = { id: string; name: string; factory_id: string }
type Job = {
  id: string
  title: string
  role_type: string
  department_id: string
  department?: { name: string } | null
  users?: { id: string }[]
}

export default function JobsClient({ departments, jobs }: {
  departments: Department[]
  jobs: Job[]
}) {
  const [showJob, setShowJob] = useState(false)
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '')
  const [jobTitle, setJobTitle] = useState('')
  const [jobRole, setJobRole] = useState('worker')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function createJob() {
    if (!departmentId || !jobTitle.trim()) { setError('Vui lòng nhập đầy đủ vị trí'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/settings/job-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department_id: departmentId, title: jobTitle, role_type: jobRole }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Không thể tạo vị trí'); return }
    window.location.reload()
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vị trí công việc</h1>
          <p className="text-sm text-gray-500">Cấu hình vị trí công việc và kế hoạch checklist tháng.</p>
        </div>
        <button onClick={() => { setShowJob(true); setError('') }} className="btn-primary min-h-0 px-3 py-2 text-sm"><Plus size={16} /> Vị trí</button>
      </div>

      {showJob && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Thêm vị trí công việc</h2>
            <button onClick={() => setShowJob(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="label">Bộ phận *</label>
              <select value={departmentId} onChange={event => setDepartmentId(event.target.value)} className="input">
                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
            <div><label className="label">Loại vai trò</label><select value={jobRole} onChange={e => setJobRole(e.target.value)} className="input"><option value="worker">Worker</option><option value="supervisor">Supervisor</option><option value="manager">Manager</option></select></div>
            <div className="md:col-span-3"><label className="label">Tên vị trí *</label><input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="input" placeholder="Inbound Warehouse Worker" /></div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button onClick={createJob} disabled={saving} className="btn-primary mt-4 min-h-0 px-4 py-2 text-sm">
            {saving && <Loader2 size={14} className="animate-spin" />} Lưu
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-2.5 font-medium">Vị trí</th>
              <th className="px-4 py-2.5 font-medium">Bộ phận</th>
              <th className="px-4 py-2.5 font-medium">Loại</th>
              <th className="px-4 py-2.5 font-medium">Users</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/settings/jobs/${job.id}`} className="font-medium text-blue-700 hover:underline">{job.title}</Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{job.department?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{roleTypeLabel(job.role_type)}</td>
                <td className="px-4 py-3 text-gray-600">{job.users?.length ?? 0}</td>
              </tr>
            ))}
            {!jobs.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Chưa có vị trí công việc.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function roleTypeLabel(value: string) {
  if (value === 'supervisor') return 'Supervisor'
  if (value === 'manager') return 'Manager'
  return 'Worker'
}
