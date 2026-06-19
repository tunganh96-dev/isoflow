'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { vi } from '@/lib/i18n/vi'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(vi.login_error)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    window.location.href = profile?.role === 'employee' ? '/checklists' : '/dashboard'
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Logo / title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-lg mb-3">
            IS
          </div>
          <h1 className="text-xl font-bold text-gray-900">{vi.app_name}</h1>
          <p className="text-sm text-gray-500 mt-1">Hệ thống quản lý ISO 9001</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              {vi.email}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              {vi.password}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-base text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary"
          >
            {loading ? vi.loading : vi.login}
          </button>
        </form>
      </div>
    </div>
  )
}
