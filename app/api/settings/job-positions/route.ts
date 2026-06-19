import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

const ROLE_TYPES = ['worker', 'supervisor', 'manager']

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { department_id, title, role_type } = await request.json().catch(() => ({}))
  if (!department_id || !title?.trim()) {
    return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('job_positions')
    .insert({
      department_id,
      title: title.trim(),
      role_type: ROLE_TYPES.includes(role_type) ? role_type : 'worker',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Create job position error:')
    return NextResponse.json({ error: 'Không thể tạo vị trí công việc' }, { status: 500 })
  }

  return NextResponse.json({ job_position: data }, { status: 201 })
}
