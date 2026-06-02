import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'qa_manager') return NextResponse.json({ error: 'Chỉ Quản lý QA mới có thể phê duyệt' }, { status: 403 })

  const { data: ncr } = await supabase.from('ncrs').select('*').eq('id', params.id).single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (ncr.status !== 'pending_capa_approval') return NextResponse.json({ error: 'NCR không ở trạng thái chờ duyệt CAPA' }, { status: 400 })

  const { error } = await supabase.from('ncrs').update({
    status: 'implementing',
    capa_approved_by: user.id,
    capa_approved_at: new Date().toISOString(),
    capa_rejection_notes: null,
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể phê duyệt CAPA' }, { status: 500 })

  await supabase.from('ncr_activity').insert({
    ncr_id: params.id, user_id: user.id, action: 'capa_approved', notes: 'CAPA được phê duyệt',
  })

  if (ncr.assigned_to) {
    await createNotification(supabase, ncr.assigned_to,
      'CAPA đã được phê duyệt',
      `${ncr.ncr_code}: Hãy tiến hành thực hiện hành động khắc phục`,
      `/ncr/${params.id}`
    )
  }

  return NextResponse.json({ success: true })
}
