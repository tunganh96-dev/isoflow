import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const notificationId = typeof body.id === 'string' ? body.id : null

  let query = supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)

  if (notificationId) query = query.eq('id', notificationId)
  else query = query.eq('read', false)

  const { error } = await query
  if (error) return NextResponse.json({ error: 'Không thể cập nhật thông báo' }, { status: 500 })

  return NextResponse.json({ success: true })
}
