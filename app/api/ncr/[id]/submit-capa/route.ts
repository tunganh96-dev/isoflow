import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyManagers } from '@/lib/notifications'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ncr } = await supabase.from('ncrs').select('*').eq('id', params.id).single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (ncr.status !== 'analysing') return NextResponse.json({ error: 'NCR không ở trạng thái phân tích' }, { status: 400 })
  if (ncr.assigned_to !== user.id) return NextResponse.json({ error: 'Chỉ người được phân công mới có thể điền phân tích' }, { status: 403 })

  const { root_cause_analysis, proposed_capa } = await request.json()
  if (!root_cause_analysis?.trim() || !proposed_capa?.trim()) {
    return NextResponse.json({ error: 'Vui lòng điền đầy đủ phân tích nguyên nhân và đề xuất CAPA' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ncrs')
    .update({ root_cause_analysis, proposed_capa, status: 'pending_capa_approval' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể gửi CAPA' }, { status: 500 })

  await supabase.from('ncr_activity').insert({
    ncr_id: params.id, user_id: user.id, action: 'capa_submitted',
    notes: 'Đã gửi phân tích nguyên nhân và đề xuất CAPA',
  })

  await notifyManagers(supabase,
    'Nguyên nhân NCR đã được gửi',
    `${ncr.ncr_code} chờ phê duyệt CAPA`,
    `/ncr/${params.id}`
  )

  return NextResponse.json({ success: true })
}
