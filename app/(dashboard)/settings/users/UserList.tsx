'use client'

import { useState } from 'react'
import { Plus, Pencil, X, Loader2, Search, KeyRound } from 'lucide-react'
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/roles'
import { vi } from '@/lib/i18n/vi'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
  factories: { id: string; name: string } | null
  departments: { id: string; name: string } | null
  job_position: { id: string; title: string } | null
}

interface Props {
  users: User[]
  factories: { id: string; name: string; code: string }[]
  departments: { id: string; name: string; factory_id: string }[]
  jobPositions: { id: string; title: string; department_id: string }[]
  query: string
}

export default function UserList({ users: initialUsers, factories, departments, jobPositions, query }: Props) {
  const users = initialUsers
  const [showInvite, setShowInvite] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Invite form
  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invRole, setInvRole] = useState('employee')
  const [invFactory, setInvFactory] = useState('')
  const [invDept, setInvDept] = useState('')
  const [invJobPosition, setInvJobPosition] = useState('')
  const [invPassword, setInvPassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invError, setInvError] = useState('')

  // Edit form
  const [editRole, setEditRole] = useState('')
  const [editFactory, setEditFactory] = useState('')
  const [editDept, setEditDept] = useState('')
  const [editJobPosition, setEditJobPosition] = useState('')
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [forcingPwId, setForcingPwId] = useState<string | null>(null)

  const filteredInvDepts = invFactory ? departments.filter(d => d.factory_id === invFactory) : []
  const filteredEditDepts = editFactory ? departments.filter(d => d.factory_id === editFactory) : []
  const filteredInvJobs = invDept ? jobPositions.filter(job => job.department_id === invDept) : []
  const filteredEditJobs = editDept ? jobPositions.filter(job => job.department_id === editDept) : []

  async function handleInvite() {
    if (!invEmail || !invName || !invPassword) { setInvError('Vui lòng điền đầy đủ thông tin'); return }
    if (invPassword.length < 6) { setInvError('Mật khẩu phải có ít nhất 6 ký tự'); return }
    setInviting(true)
    setInvError('')

    const res = await fetch('/api/settings/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: invEmail,
        full_name: invName,
        password: invPassword,
        role: invRole,
        factory_id: invFactory || null,
        department_id: invDept || null,
        job_position_id: invJobPosition || null,
      }),
    })
    const data = await res.json()
    setInviting(false)

    if (!res.ok) { setInvError(data.error ?? vi.error_generic_short); return }

    // Refresh
    window.location.reload()
  }

  function startEdit(user: User) {
    setEditingId(user.id)
    setEditName(user.full_name)
    setEditRole(user.role)
    setEditFactory((user.factories as any)?.id ?? '')
    setEditDept((user.departments as any)?.id ?? '')
    setEditJobPosition((user.job_position as any)?.id ?? '')
    setEditError('')
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setSaving(true)
    setEditError('')

    const res = await fetch(`/api/settings/users/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: editName,
        role: editRole,
        factory_id: editFactory || null,
        department_id: editDept || null,
        job_position_id: editJobPosition || null,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setEditError(data.error ?? vi.error_generic_short); return }

    window.location.reload()
  }

  async function handleForcePasswordChange(userId: string) {
    setForcingPwId(userId)
    const res = await fetch(`/api/settings/users/${userId}`, { method: 'POST' })
    setForcingPwId(null)
    if (res.ok) {
      alert('Đã yêu cầu người dùng đổi mật khẩu')
    } else {
      const data = await res.json()
      alert(data.error ?? 'Không thể yêu cầu đổi mật khẩu')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Người dùng</h2>
          <p className="text-sm text-gray-500 mt-1">{users.length} người dùng</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setEditingId(null) }}
          className="btn-primary text-sm px-3 py-2 min-h-0"
        >
          <Plus size={16} /> Thêm người dùng
        </button>
      </div>

      <form method="GET" className="mb-3">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Tìm tên, email, vai trò..."
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Thêm người dùng mới</h3>
            <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Họ tên *</label>
              <input value={invName} onChange={e => setInvName(e.target.value)} className="input" placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input value={invEmail} onChange={e => setInvEmail(e.target.value)} className="input" type="email" placeholder="email@company.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mật khẩu *</label>
              <input value={invPassword} onChange={e => setInvPassword(e.target.value)} className="input" type="password" placeholder="Ít nhất 6 ký tự" />
            </div>
            <div>
              <label className="label">Vai trò *</label>
              <select value={invRole} onChange={e => setInvRole(e.target.value)} className="input">
                <option value="employee">Nhân viên</option>
                <option value="department_head">Trưởng bộ phận</option>
                <option value="factory_admin">Quản lý nhà máy</option>
                <option value="coo">COO</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nhà máy</label>
              <select value={invFactory} onChange={e => { setInvFactory(e.target.value); setInvDept(''); setInvJobPosition('') }} className="input">
                <option value="">Không chọn</option>
                {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bộ phận</label>
              <select value={invDept} onChange={e => { setInvDept(e.target.value); setInvJobPosition('') }} className="input" disabled={!invFactory}>
                <option value="">Không chọn</option>
                {filteredInvDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Vị trí công việc</label>
            <select value={invJobPosition} onChange={e => setInvJobPosition(e.target.value)} className="input" disabled={!invDept}>
              <option value="">Không chọn</option>
              {filteredInvJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </div>
          {invError && <p className="text-sm text-red-600">{invError}</p>}
          <button onClick={handleInvite} disabled={inviting} className="btn-primary text-sm px-4 py-2 min-h-0">
            {inviting && <Loader2 size={14} className="animate-spin" />}
            Tạo tài khoản
          </button>
        </div>
      )}

      {/* User table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Họ và tên</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Vai trò</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Nhà máy</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Bộ phận</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Vị trí</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === u.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="input text-sm py-1" />
                      </td>
                      <td className="px-4 py-2 text-gray-500">{u.email}</td>
                      <td className="px-4 py-2">
                        <select value={editRole} onChange={e => setEditRole(e.target.value)} className="input text-sm py-1">
                          <option value="employee">Nhân viên</option>
                          <option value="department_head">Trưởng bộ phận</option>
                          <option value="factory_admin">Quản lý nhà máy</option>
                          <option value="coo">COO</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={editFactory} onChange={e => { setEditFactory(e.target.value); setEditDept(''); setEditJobPosition('') }} className="input text-sm py-1">
                          <option value="">—</option>
                          {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={editDept} onChange={e => { setEditDept(e.target.value); setEditJobPosition('') }} className="input text-sm py-1" disabled={!editFactory}>
                          <option value="">—</option>
                          {filteredEditDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={editJobPosition} onChange={e => setEditJobPosition(e.target.value)} className="input text-sm py-1" disabled={!editDept}>
                          <option value="">—</option>
                          {filteredEditJobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={handleSaveEdit} disabled={saving} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Lưu'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Hủy</button>
                        </div>
                        {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{(u.factories as any)?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{(u.departments as any)?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{(u.job_position as any)?.title ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(u)} className="text-gray-400 hover:text-gray-600" title="Chỉnh sửa">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleForcePasswordChange(u.id)}
                            disabled={forcingPwId === u.id}
                            className="text-gray-400 hover:text-amber-600"
                            title="Yêu cầu đổi mật khẩu"
                          >
                            {forcingPwId === u.id ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                          </button>
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
