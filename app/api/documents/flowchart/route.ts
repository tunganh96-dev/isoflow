import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ANTHROPIC_MODEL } from '@/lib/anthropic'

const client = new Anthropic()

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json().catch(() => ({}))
  if (!content) return NextResponse.json({ error: 'Thiếu nội dung' }, { status: 400 })

  try {
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: `Bạn là chuyên gia ISO 9001. Từ các bước quy trình dưới đây, hãy tạo Mermaid flowchart diagram code.
Sử dụng: flowchart TD
Nodes: tiếng Việt ngắn gọn (tối đa 5 từ mỗi node)
Bao gồm: decision diamonds cho các bước có điều kiện Yes/No
Chỉ trả về Mermaid code, không có text khác.
Trả lời bằng tiếng Việt có đầy đủ dấu.`,
      messages: [{ role: 'user', content }],
    })

    let mermaid_code = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    mermaid_code = mermaid_code.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '')

    return NextResponse.json({ mermaid_code })
  } catch (err) {
    console.error('Flowchart generation error:')
    return NextResponse.json({ error: 'Không thể tạo sơ đồ. Vui lòng thử lại.' }, { status: 500 })
  }
}
