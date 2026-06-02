import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification, notifyManagers } from '@/lib/notifications'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'qa_manager') return NextResponse.json({ error: 'Chỉ Quản lý QA mới có thể xác nhận' }, { status: 403 })

  const { data: ncr } = await supabase.from('ncrs').select('*').eq('id', params.id).single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (ncr.status !== 'pending_verification') return NextResponse.json({ error: 'NCR không ở trạng thái chờ xác nhận' }, { status: 400 })

  const { effective, notes } = await request.json()

  if (effective) {
    // Phase 1: go straight to completed (no process change check yet)
    const { error } = await supabase.from('ncrs').update({
      status: 'completed',
      verification_notes: notes ?? null,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
    }).eq('id', params.id)

    if (error) return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 })

    await supabase.from('ncr_activity').insert({
      ncr_id: params.id, user_id: user.id, action: 'verified_effective',
      notes: 'Xác nhận hành động khắc phục hiệu quả — chờ tạo báo cáo đóng',
    })

    // Notify all involved parties
    const involvedIds = Array.from(new Set([ncr.raised_by, ncr.assigned_to].filter(Boolean)))
    for (const uid of involvedIds) {
      await createNotification(supabase, uid,
        'NCR đã hoàn thành',
        `${ncr.ncr_code} đã được xác nhận hiệu quả và đóng lại`,
        `/ncr/${params.id}`
      )
    }
  } else {
    // Not effective — bounce back to analysing
    const { error } = await supabase.from('ncrs').update({
      status: 'analysing',
      verification_notes: notes ?? null,
      verified_by: null,
      verified_at: null,
    }).eq('id', params.id)

    if (error) return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 })

    await supabase.from('ncr_activity').insert({
      ncr_id: params.id, user_id: user.id, action: 'verification_failed',
      notes: notes ?? 'Hành động chưa hiệu quả, yêu cầu phân tích lại',
    })

    if (ncr.assigned_to) {
      await createNotification(supabase, ncr.assigned_to,
        'Hành động khắc phục chưa hiệu quả',
        `${ncr.ncr_code}: ${notes ?? 'Vui lòng phân tích lại nguyên nhân'}`,
        `/ncr/${params.id}`
      )
    }
  }

  return NextResponse.json({ success: true })
}
