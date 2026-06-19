import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { canApproveQualityRecord } from '@/lib/roles'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canApproveQualityRecord(profile?.role)) return NextResponse.json({ error: 'Không có quyền từ chối' }, { status: 403 })

  const { data: ncr } = await supabase
    .from('ncrs')
    .select('status, assigned_to, ncr_code')
    .eq('id', params.id)
    .single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (ncr.status !== 'pending_capa_approval') return NextResponse.json({ error: 'NCR không ở trạng thái chờ duyệt CAPA' }, { status: 400 })

  const { notes } = await request.json().catch(() => ({}))
  if (!notes?.trim()) return NextResponse.json({ error: 'Vui lòng nhập lý do từ chối' }, { status: 400 })

  const { error } = await supabase.from('ncrs').update({
    status: 'analysing',
    capa_rejection_notes: notes,
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể từ chối CAPA' }, { status: 500 })

  await supabase.from('ncr_activity').insert({
    ncr_id: params.id, user_id: user.id, action: 'capa_rejected', notes,
  })

  if (ncr.assigned_to) {
    await createNotification(supabase, ncr.assigned_to,
      'CAPA bị từ chối',
      `${ncr.ncr_code}: ${notes}`,
      `/ncr/${params.id}`
    )
  }

  return NextResponse.json({ success: true })
}
