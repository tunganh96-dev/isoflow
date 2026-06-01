import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowedTypes = ['pdf', 'docx', 'doc', 'txt', 'md']
  if (!ext || !allowedTypes.includes(ext)) {
    return NextResponse.json({ error: 'Chỉ hỗ trợ PDF, Word, hoặc văn bản thuần' }, { status: 400 })
  }

  try {
    // Store original file in Supabase Storage
    const admin = createAdminClient()
    const filePath = `${user.id}/${Date.now()}-${file.name}`
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { data: uploadData } = await admin.storage
      .from('source-documents')
      .upload(filePath, fileBuffer, { contentType: file.type, upsert: false })

    const source_file_url = uploadData?.path ?? null

    // Extract text content for Claude
    let textContent = ''

    if (ext === 'pdf') {
      // Send PDF as base64 to Claude
      const base64 = fileBuffer.toString('base64')
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 },
              } as never,
              {
                type: 'text',
                text: `Đọc tài liệu này và chuyển đổi sang định dạng văn bản chuẩn ISO 9001 bằng tiếng Việt.
Giữ nguyên cấu trúc và nội dung. Định dạng bằng Markdown.
Trả lời bằng tiếng Việt có đầy đủ dấu. Chỉ trả về nội dung tài liệu.`,
              },
            ],
          },
        ],
      })
      textContent = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } else if (ext === 'docx' || ext === 'doc') {
      // Use mammoth to extract text from Word
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer: fileBuffer })
      textContent = result.value

      // Send to Claude for structuring
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `Bạn là chuyên gia ISO 9001. Hãy chuyển đổi nội dung tài liệu Word sau thành định dạng Markdown chuẩn ISO 9001.
Giữ nguyên nội dung, cải thiện cấu trúc nếu cần. Trả lời bằng tiếng Việt có đầy đủ dấu.`,
        messages: [{ role: 'user', content: textContent }],
      })
      textContent = msg.content[0].type === 'text' ? msg.content[0].text : textContent
    } else {
      // Plain text / markdown — read directly
      textContent = new TextDecoder().decode(fileBuffer)
    }

    // Generate Mermaid flowchart if content has steps
    let mermaid_code: string | null = null
    if (textContent.length > 100) {
      const flowMsg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `Bạn là chuyên gia ISO 9001. Từ các bước quy trình dưới đây, hãy tạo Mermaid flowchart diagram code.
Sử dụng: flowchart TD. Nodes: tiếng Việt ngắn gọn (tối đa 5 từ mỗi node).
Nếu tài liệu không có các bước tuần tự, trả về: NO_FLOWCHART
Chỉ trả về Mermaid code hoặc NO_FLOWCHART. Trả lời bằng tiếng Việt có đầy đủ dấu.`,
        messages: [{ role: 'user', content: textContent.slice(0, 3000) }],
      })
      const raw = flowMsg.content[0].type === 'text' ? flowMsg.content[0].text.trim() : ''
      if (raw && !raw.includes('NO_FLOWCHART')) {
        mermaid_code = raw.replace(/^```mermaid\n?/, '').replace(/\n?```$/, '')
      }
    }

    return NextResponse.json({ content: textContent, mermaid_code, source_file_url })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: 'Không thể đọc file. Vui lòng thử lại.' }, { status: 500 })
  }
}
