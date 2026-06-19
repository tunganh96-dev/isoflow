import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyManagers } from '@/lib/notifications'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ncr } = await supabase
    .from('ncrs')
    .select('id, ncr_code, status, assigned_to, factory_id')
    .eq('id', params.id)
    .single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (ncr.status !== 'implementing') return NextResponse.json({ error: 'NCR không ở trạng thái thực hiện' }, { status: 400 })
  if (ncr.assigned_to !== user.id) return NextResponse.json({ error: 'Chỉ người được phân công mới có thể cập nhật' }, { status: 403 })

  const { implementation_notes, evidence_urls } = await request.json().catch(() => ({}))
  if (!implementation_notes?.trim()) return NextResponse.json({ error: 'Vui lòng mô tả hành động đã thực hiện' }, { status: 400 })
  const expectedEvidencePrefix = `${ncr.factory_id}/${user.id}/evidence/${params.id}/`
  if (!Array.isArray(evidence_urls) || evidence_urls.some(path => typeof path !== 'string' || !path.startsWith(expectedEvidencePrefix))) {
    return NextResponse.json({ error: 'Đường dẫn bằng chứng không hợp lệ' }, { status: 400 })
  }

  const { error } = await supabase.from('ncrs').update({
    implementation_notes,
    implementation_evidence_urls: evidence_urls ?? [],
    status: 'pending_verification',
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 })

  await supabase.from('ncr_activity').insert({
    ncr_id: params.id, user_id: user.id, action: 'evidence_submitted',
    notes: 'Đã hoàn thành thực hiện, gửi xác nhận',
  })

  await notifyManagers(supabase,
    'NCR chờ xác nhận hiệu quả',
    `${ncr.ncr_code}: Hành động khắc phục đã thực hiện, cần xác nhận`,
    `/ncr/${params.id}`,
    ncr.factory_id
  )

  return NextResponse.json({ success: true })
}
