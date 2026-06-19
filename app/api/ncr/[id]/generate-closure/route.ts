import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canApproveQualityRecord } from '@/lib/roles'
import { ANTHROPIC_MODEL } from '@/lib/anthropic'

const anthropic = new Anthropic()

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canApproveQualityRecord(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { data: ncr } = await supabase
    .from('ncrs')
    .select('status, ncr_code, description, severity, root_cause_analysis, proposed_capa, implementation_notes, verification_notes')
    .eq('id', params.id)
    .single()
  if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
  if (ncr.status !== 'completed') return NextResponse.json({ error: 'NCR chưa hoàn thành' }, { status: 400 })

  const prompt = `Thông tin NCR:
- Mã NCR: ${ncr.ncr_code}
- Mô tả vấn đề: ${ncr.description}
- Mức độ: ${ncr.severity}
- Phân tích nguyên nhân (5-Why): ${ncr.root_cause_analysis ?? 'Không có'}
- Hành động khắc phục đề xuất: ${ncr.proposed_capa ?? 'Không có'}
- Kết quả thực hiện: ${ncr.implementation_notes ?? 'Không có'}
- Ghi chú xác nhận: ${ncr.verification_notes ?? 'Không có'}`

  try {
    const msg = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: `Bạn là chuyên gia hệ thống quản lý chất lượng ISO 9001.
Dựa trên thông tin NCR đã hoàn thành dưới đây, hãy viết phần KẾT LUẬN cho báo cáo đóng NCR (2-3 câu tiếng Việt):
- Tóm tắt ngắn gọn vấn đề đã xảy ra
- Hành động khắc phục đã thực hiện
- Kết quả đạt được
Chỉ viết phần kết luận. Trả lời bằng tiếng Việt có đầy đủ dấu.`,
      messages: [{ role: 'user', content: prompt }],
    })

    const closure_report = msg.content[0].type === 'text' ? msg.content[0].text : ''

    const { error } = await supabase.from('ncrs').update({ closure_report }).eq('id', params.id)
    if (error) return NextResponse.json({ error: 'Không thể lưu báo cáo' }, { status: 500 })

    return NextResponse.json({ closure_report })
  } catch (err) {
    console.error('Closure report error:')
    return NextResponse.json({ error: 'Không thể tạo báo cáo đóng' }, { status: 500 })
  }
}
