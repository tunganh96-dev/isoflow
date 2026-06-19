import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'
import type { Database } from '@/types/supabase'

type DepartmentUpdate = Database['public']['Tables']['departments']['Update']

// PATCH /api/settings/departments/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const updates: DepartmentUpdate = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.code !== undefined) updates.code = body.code
  if (body.exclude_from_cross_audit !== undefined) updates.exclude_from_cross_audit = body.exclude_from_cross_audit

  const { error } = await supabase.from('departments').update(updates).eq('id', params.id)

  if (error) {
    console.error('Update department error:')
    return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/settings/departments/[id]
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  // Check if department has users
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('department_id', params.id)

  if (count && count > 0) {
    return NextResponse.json({ error: `Không thể xóa — có ${count} người dùng thuộc bộ phận này` }, { status: 400 })
  }

  const { error } = await supabase.from('departments').delete().eq('id', params.id)

  if (error) {
    console.error('Delete department error:')
    return NextResponse.json({ error: 'Không thể xóa bộ phận' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
