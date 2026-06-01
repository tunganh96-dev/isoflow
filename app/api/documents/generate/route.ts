import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/lib/documents'

const client = new Anthropic()

const DOC_PROMPTS: Record<string, string> = {
  sop: `Bạn là chuyên gia hệ thống quản lý chất lượng ISO 9001 cho nhà máy sản xuất tại Việt Nam.
Hãy tạo một Quy trình (SOP) chuẩn ISO 9001:2015 với cấu trúc:
1. Mục đích
2. Phạm vi áp dụng
3. Tài liệu tham chiếu
4. Định nghĩa và viết tắt
5. Trách nhiệm
6. Nội dung quy trình (các bước chi tiết có đánh số)
7. Hồ sơ liên quan
Ngôn ngữ chuyên nghiệp, rõ ràng. Chỉ trả về nội dung tài liệu.
Trả lời bằng tiếng Việt có đầy đủ dấu.`,

  work_instruction: `Bạn là chuyên gia ISO 9001 cho nhà máy sản xuất tại Việt Nam.
Hãy tạo một Hướng dẫn công việc chi tiết với cấu trúc:
1. Mục đích
2. Phạm vi áp dụng
3. Dụng cụ và vật liệu cần thiết
4. Các bước thực hiện (đánh số chi tiết, từng bước rõ ràng)
5. Kiểm soát chất lượng
6. An toàn lao động
7. Hồ sơ liên quan
Ngôn ngữ đơn giản, dễ hiểu cho công nhân. Chỉ trả về nội dung tài liệu.
Trả lời bằng tiếng Việt có đầy đủ dấu.`,

  quality_policy: `Bạn là chuyên gia ISO 9001 cho nhà máy sản xuất tại Việt Nam.
Hãy tạo một Chính sách chất lượng chuẩn ISO 9001:2015 với cấu trúc:
1. Tuyên bố chính sách
2. Mục tiêu chất lượng
3. Cam kết của lãnh đạo
4. Phạm vi áp dụng
5. Trách nhiệm thực hiện
Ngôn ngữ trang trọng, phù hợp để trình bày tại nhà máy. Chỉ trả về nội dung tài liệu.
Trả lời bằng tiếng Việt có đầy đủ dấu.`,

  audit_checklist: `Bạn là chuyên gia kiểm toán ISO 9001 tại Việt Nam.
Hãy tạo một Bảng kiểm tra nội bộ ISO 9001:2015 với cấu trúc:
1. Thông tin kiểm toán (ngày, bộ phận, kiểm toán viên)
2. Danh sách câu hỏi kiểm tra (nhóm theo điều khoản ISO)
3. Cột đánh giá: Đạt / Không đạt / Quan sát
4. Ghi chú phát hiện
5. Kết luận tổng thể
Chỉ trả về nội dung tài liệu. Trả lời bằng tiếng Việt có đầy đủ dấu.`,

  risk_register: `Bạn là chuyên gia quản lý rủi ro ISO 9001 tại Việt Nam.
Hãy tạo một Sổ đăng ký rủi ro theo ISO 9001:2015 với cấu trúc:
1. Hướng dẫn sử dụng
2. Bảng nhận diện rủi ro (STT | Rủi ro | Nguyên nhân | Mức độ | Hành động kiểm soát | Người chịu trách nhiệm)
3. Ít nhất 5-8 rủi ro điển hình cho nhà máy sản xuất
4. Thang đánh giá mức độ rủi ro
Chỉ trả về nội dung tài liệu. Trả lời bằng tiếng Việt có đầy đủ dấu.`,
}

const DEFAULT_PROMPT = `Bạn là chuyên gia hệ thống quản lý chất lượng ISO 9001 cho nhà máy sản xuất tại Việt Nam.
Hãy tạo tài liệu ISO 9001:2015 phù hợp với mô tả sau. Cấu trúc rõ ràng, chuyên nghiệp.
Chỉ trả về nội dung tài liệu. Trả lời bằng tiếng Việt có đầy đủ dấu.`

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, doc_type, description, factory_name } = await request.json()

  if (!title || !doc_type) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const systemPrompt = DOC_PROMPTS[doc_type] ?? DEFAULT_PROMPT
  const docTypeLabel = DOC_TYPE_LABELS[doc_type] ?? doc_type
  const factoryNote = factory_name ? ` tại nhà máy ${factory_name}` : ''

  try {
    // Generate document content
    const contentMsg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Tên tài liệu: ${title}\nLoại: ${docTypeLabel}${factoryNote}\nMô tả: ${description || 'Tạo tài liệu chuẩn ISO 9001'}`,
        },
      ],
    })

    const content = contentMsg.content[0].type === 'text' ? contentMsg.content[0].text : ''

    // Generate Mermaid flowchart for SOP and work_instruction
    let mermaid_code: string | null = null
    if (['sop', 'work_instruction'].includes(doc_type)) {
      const flowMsg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `Bạn là chuyên gia ISO 9001. Từ các bước quy trình dưới đây, hãy tạo Mermaid flowchart diagram code.
Sử dụng: flowchart TD
Nodes: tiếng Việt ngắn gọn (tối đa 5 từ mỗi node)
Bao gồm: decision diamonds cho các bước có điều kiện Yes/No
Chỉ trả về Mermaid code, không có text khác.
Trả lời bằng tiếng Việt có đầy đủ dấu.`,
        messages: [{ role: 'user', content }],
      })
      mermaid_code = flowMsg.content[0].type === 'text' ? flowMsg.content[0].text.trim() : null
      // Strip markdown code fences if present
      mermaid_code = mermaid_code?.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '') ?? null
    }

    return NextResponse.json({ content, mermaid_code })
  } catch (err) {
    console.error('Claude generation error:', err)
    return NextResponse.json({ error: 'Không thể tạo nội dung. Vui lòng thử lại.' }, { status: 500 })
  }
}
