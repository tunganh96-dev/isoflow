import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// POST /api/settings/password — change own password
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { current_password, new_password } = await request.json().catch(() => ({}))

  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  if (new_password.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 })
  }

  // Verify current password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: current_password,
  })

  if (signInError) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 })
  }

  // Update password using admin client
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: new_password,
  })

  if (error) {
    console.error('Update password error:')
    return NextResponse.json({ error: 'Không thể đổi mật khẩu' }, { status: 500 })
  }

  // Update password tracking
  await admin.from('users').update({
    password_changed_at: new Date().toISOString(),
    force_password_change: false,
  }).eq('id', user.id)

  return NextResponse.json({ success: true })
}
