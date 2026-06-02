import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'qa_manager') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { data: ncr } = await supabase.from('ncrs').select('*').eq('id', params.id).single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (!ncr.closure_report) return NextResponse.json({ error: 'Chưa có báo cáo đóng NCR' }, { status: 400 })

  const { error } = await supabase.from('ncrs').update({
    closure_approved_by: user.id,
    closure_approved_at: new Date().toISOString(),
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể phê duyệt báo cáo' }, { status: 500 })

  await supabase.from('ncr_activity').insert({
    ncr_id: params.id, user_id: user.id, action: 'closure_approved',
    notes: 'Báo cáo đóng NCR đã được phê duyệt',
  })

  // Notify all involved
  const ids = Array.from(new Set([ncr.raised_by, ncr.assigned_to].filter(Boolean)))
  for (const uid of ids) {
    await createNotification(supabase, uid,
      'Báo cáo đóng NCR đã được phê duyệt',
      `${ncr.ncr_code} đã chính thức đóng lại`,
      `/ncr/${params.id}`
    )
  }

  return NextResponse.json({ success: true })
}
