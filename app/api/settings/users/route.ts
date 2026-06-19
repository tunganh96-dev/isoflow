import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

const VALID_ROLES = ['super_admin', 'coo', 'factory_admin', 'department_head', 'employee']

// POST /api/settings/users — create new user
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền thêm người dùng' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { email, full_name, password, role, factory_id, department_id, job_position_id } = body

  if (!email || !full_name || !password || !role) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })
  }

  // Use service role to create auth user
  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 })
    }
    console.error('Create auth user error:')
    return NextResponse.json({ error: 'Không thể tạo tài khoản' }, { status: 500 })
  }

  // Create profile in users table
  const { error: profileError } = await admin.from('users').insert({
    id: authData.user.id,
    email,
    full_name,
    role,
    factory_id: factory_id ?? null,
    department_id: department_id ?? null,
    job_position_id: job_position_id ?? null,
  })

  if (profileError) {
    // Cleanup auth user if profile fails
    await admin.auth.admin.deleteUser(authData.user.id)
    console.error('Create profile error:')
    return NextResponse.json({ error: 'Không thể tạo hồ sơ người dùng' }, { status: 500 })
  }

  return NextResponse.json({ user: { id: authData.user.id, email, full_name, role } }, { status: 201 })
}
