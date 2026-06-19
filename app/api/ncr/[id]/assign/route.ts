import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { canApproveQualityRecord } from '@/lib/roles'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canApproveQualityRecord(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền phân công' }, { status: 403 })
  }

  const { assigned_to, due_date } = await request.json().catch(() => ({}))
  if (!assigned_to || !due_date) {
    return NextResponse.json({ error: 'Vui lòng chọn người phụ trách và hạn xử lý' }, { status: 400 })
  }

  const { data: ncr } = await supabase
    .from('ncrs')
    .select('status, ncr_code, description')
    .eq('id', params.id)
    .single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (ncr.status !== 'open') return NextResponse.json({ error: 'NCR không ở trạng thái Mới mở' }, { status: 400 })

  const { error } = await supabase
    .from('ncrs')
    .update({ assigned_to, due_date, status: 'analysing' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể phân công' }, { status: 500 })

  await supabase.from('ncr_activity').insert({
    ncr_id: params.id, user_id: user.id, action: 'assigned',
    notes: `Phân công xử lý, hạn: ${due_date}`,
  })

  await createNotification(supabase, assigned_to,
    'Bạn được phân công xử lý NCR',
    `${ncr.ncr_code}: ${ncr.description.slice(0, 80)}`,
    `/ncr/${params.id}`
  )

  return NextResponse.json({ success: true })
}
