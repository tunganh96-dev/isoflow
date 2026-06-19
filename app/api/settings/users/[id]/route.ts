import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'
import type { Database } from '@/types/supabase'

type UserUpdate = Database['public']['Tables']['users']['Update']

const VALID_ROLES = ['super_admin', 'coo', 'factory_admin', 'department_head', 'employee']

// PATCH /api/settings/users/[id] — update user profile
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền chỉnh sửa' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { full_name, role, factory_id, department_id, job_position_id } = body

  const updates: UserUpdate = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })
    }
    updates.role = role
  }
  if (factory_id !== undefined) updates.factory_id = factory_id
  if (department_id !== undefined) updates.department_id = department_id
  if (job_position_id !== undefined) updates.job_position_id = job_position_id

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', params.id)

  if (error) {
    console.error('Update user error:')
    return NextResponse.json({ error: 'Không thể cập nhật người dùng' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// POST /api/settings/users/[id] — force password change for a user
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({ force_password_change: true })
    .eq('id', params.id)

  if (error) {
    console.error('Force password change error:', error)
    return NextResponse.json({ error: 'Không thể yêu cầu đổi mật khẩu' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
