import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ANTHROPIC_MODEL } from '@/lib/anthropic'
import { normalizeDocumentMarkdown } from '@/lib/markdown'
import { getActiveDocumentTemplate, templatePrompt } from '@/lib/document-templates'

const anthropic = new Anthropic()
type MessageCreateBody = Parameters<typeof anthropic.messages.create>[0]
const AI_TIMEOUT_MS = 45_000

function isRetryableAiError(err: unknown) {
  const status = (err as { status?: number })?.status
  return status === 429 || status === 503 || status === 529
}

function importErrorResponse(err: unknown) {
  const status = (err as { status?: number })?.status
  const name = (err as { name?: string })?.name ?? ''
  const message = err instanceof Error ? err.message : ''

  if (status === 404 && message.includes('model:')) {
    return NextResponse.json(
      { error: 'Model AI chưa đúng hoặc API key chưa có quyền dùng model này.' },
      { status: 500 }
    )
  }

  if (isRetryableAiError(err)) {
    return NextResponse.json(
      { error: 'AI đang bận. Vui lòng thử lại sau ít phút.' },
      { status: 503 }
    )
  }

  if (name.includes('Timeout') || message.toLowerCase().includes('timeout')) {
    return NextResponse.json(
      { error: 'AI đọc file quá lâu. Vui lòng thử lại hoặc dùng file nhỏ hơn.' },
      { status: 504 }
    )
  }

  return NextResponse.json({ error: 'Không thể đọc file. Vui lòng thử lại.' }, { status: 500 })
}

async function createMessageWithRetry(body: MessageCreateBody): Promise<Anthropic.Message> {
  try {
    return await anthropic.messages.create(body, { timeout: AI_TIMEOUT_MS }) as Anthropic.Message
  } catch (err) {
    if (!isRetryableAiError(err)) throw err
    await new Promise(resolve => setTimeout(resolve, 1500))
    return await anthropic.messages.create(body, { timeout: AI_TIMEOUT_MS }) as Anthropic.Message
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const docType = formData.get('doc_type') as string | null
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

    const { data: uploadData, error: uploadError } = await admin.storage
      .from('source-documents')
      .upload(filePath, fileBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Source document upload error:')
      return NextResponse.json({ error: 'Không thể lưu file gốc. Vui lòng thử lại.' }, { status: 500 })
    }

    const source_file_url = uploadData?.path ?? null
    const template = await getActiveDocumentTemplate(supabase, docType)

    // Extract text content for Claude
    let textContent = ''

    if (ext === 'pdf') {
      // Send PDF as base64 to Claude
      const base64 = fileBuffer.toString('base64')
      const msg = await createMessageWithRetry({
        model: ANTHROPIC_MODEL,
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
${templatePrompt(template)}
Trả lời bằng tiếng Việt có đầy đủ dấu. Chỉ trả về nội dung tài liệu.`,
              },
            ],
          },
        ],
      })
      textContent = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } else if (ext === 'docx' || ext === 'doc') {
      // Use Mammoth HTML so headings/tables survive better than raw text.
      const mammoth = await import('mammoth')
      const result = await mammoth.convertToHtml({ buffer: fileBuffer })
      textContent = result.value

      // Send to Claude for structuring
      const msg = await createMessageWithRetry({
        model: ANTHROPIC_MODEL,
        max_tokens: 3000,
        system: `Bạn là chuyên gia ISO 9001. Hãy chuyển đổi HTML trích xuất từ tài liệu Word thành Markdown chuẩn ISO 9001.
Giữ nguyên nội dung, heading, bảng, danh sách và cấu trúc biểu mẫu. Bảng phải chuyển thành Markdown table.
${templatePrompt(template)}
Chỉ trả về nội dung Markdown. Trả lời bằng tiếng Việt có đầy đủ dấu.`,
        messages: [{ role: 'user', content: textContent }],
      })
      textContent = msg.content[0].type === 'text' ? msg.content[0].text : textContent
    } else {
      // Plain text / markdown — read directly
      textContent = new TextDecoder().decode(fileBuffer)
    }

    textContent = normalizeDocumentMarkdown(textContent)

    if (!textContent.trim()) {
      return NextResponse.json({ error: 'Không đọc được nội dung trong file này.' }, { status: 422 })
    }

    return NextResponse.json({ content: textContent, mermaid_code: null, source_file_url })
  } catch (err) {
    console.error('Import error:')
    return importErrorResponse(err)
  }
}
