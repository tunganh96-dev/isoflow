'use client'

import { useState } from 'react'
import { Loader2, Check, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (newPassword === currentPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại')
      return
    }

    setSaving(true)
    const res = await fetch('/api/settings/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Không thể đổi mật khẩu')
      return
    }

    // Get role to redirect properly
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      window.location.href = profile?.role === 'employee' ? '/checklists' : '/dashboard'
    } else {
      window.location.href = '/login'
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ShieldAlert size={22} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Đổi mật khẩu</h1>
          <p className="mt-1 text-sm text-gray-500">Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Mật khẩu hiện tại *</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="Nhập mật khẩu hiện tại"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">Mật khẩu mới *</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input"
              placeholder="Ít nhất 6 ký tự"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label">Xác nhận mật khẩu mới *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Đổi mật khẩu
          </button>
        </form>
      </div>
    </div>
  )
}
