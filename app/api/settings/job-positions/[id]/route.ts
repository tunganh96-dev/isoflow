import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { title } = await request.json().catch(() => ({}))
  const trimmedTitle = typeof title === 'string' ? title.trim() : ''
  if (!trimmedTitle) {
    return NextResponse.json({ error: 'Vui lòng nhập tên vị trí' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('job_positions')
    .update({ title: trimmedTitle })
    .eq('id', params.id)
    .select('id, title')
    .single()

  if (error) {
    console.error('Update job position error:')
    return NextResponse.json({ error: 'Không thể cập nhật vị trí công việc' }, { status: 500 })
  }

  return NextResponse.json({ job_position: data })
}
