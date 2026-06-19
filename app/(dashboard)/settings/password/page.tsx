'use client'

import { useState } from 'react'
import { Loader2, Check } from 'lucide-react'
import { vi } from '@/lib/i18n/vi'

export default function PasswordSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

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

    setSaving(true)
    const res = await fetch('/api/settings/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? vi.error_generic_short)
      return
    }

    setSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div>
          <label className="label">Mật khẩu hiện tại *</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="input"
            placeholder="Nhập mật khẩu hiện tại"
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
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check size={16} /> Đổi mật khẩu thành công
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2 min-h-0">
          {saving && <Loader2 size={14} className="animate-spin" />}
          Đổi mật khẩu
        </button>
      </form>
    </div>
  )
}
