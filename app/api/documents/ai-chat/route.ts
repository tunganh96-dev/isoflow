import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/lib/documents'
import { ANTHROPIC_MODEL, anthropicText } from '@/lib/anthropic'
import { normalizeDocumentMarkdown } from '@/lib/markdown'

const client = new Anthropic()

const SYSTEM_PROMPT = `Bạn là chuyên gia hệ thống quản lý chất lượng ISO 9001 cho công ty sản xuất tại Việt Nam.

Nhiệm vụ: Hỗ trợ người dùng tạo và chỉnh sửa tài liệu ISO 9001:2015.

Quy tắc:
- Trả lời bằng tiếng Việt có đầy đủ dấu.
- Phản hồi dưới dạng JSON với 2 trường:
  {"explanation": "...", "proposed_content": "..."}
- "explanation": Nội dung trả lời cho người dùng. Nếu người dùng yêu cầu phân tích/đánh giá/chỉ ra phần cần chỉnh sửa, hãy trả lời chi tiết dạng gạch đầu dòng theo từng mục tài liệu. Nếu người dùng yêu cầu viết lại/chỉnh sửa/tạo nội dung, hãy giải thích ngắn gọn phần thay đổi.
- "proposed_content": Toàn bộ nội dung tài liệu (markdown) sau khi áp dụng thay đổi. Nếu tạo mới thì là nội dung hoàn chỉnh. Nếu chỉnh sửa thì là bản đầy đủ đã cập nhật (không phải chỉ phần thay đổi).
- Nếu người dùng chỉ yêu cầu phân tích, kiểm tra, nhận xét hoặc chỉ ra điểm cần sửa, đặt "proposed_content": "" và đưa toàn bộ phân tích vào "explanation".
- Nếu người dùng yêu cầu viết lại hoặc áp dụng chỉnh sửa, mới trả về "proposed_content".
- Chỉ trả về JSON, không có text khác bên ngoài JSON.
- Không bọc JSON trong markdown code fence. Không dùng \`\`\`json.
- Nội dung tài liệu phải chuyên nghiệp, chuẩn ISO 9001:2015.
- Cấu trúc SOP: Mục đích, Phạm vi, Tài liệu tham chiếu, Định nghĩa, Trách nhiệm, Nội dung quy trình, Hồ sơ liên quan.
- Cấu trúc Hướng dẫn công việc: Mục đích, Phạm vi, Dụng cụ, Các bước thực hiện, Kiểm soát chất lượng, An toàn lao động.`

const ANALYSIS_SYSTEM_PROMPT = `Bạn là chuyên gia hệ thống quản lý chất lượng ISO 9001 cho công ty sản xuất tại Việt Nam.

Nhiệm vụ: Phân tích tài liệu ISO hiện tại và chỉ ra phần cần chỉnh sửa/viết tốt hơn.

Quy tắc:
- Trả lời bằng tiếng Việt có đầy đủ dấu.
- Trả lời trực tiếp bằng văn bản dễ đọc, không trả JSON, không dùng markdown code fence.
- Không viết lại toàn bộ tài liệu, trừ khi người dùng yêu cầu rõ ràng.
- Đưa đủ chi tiết để người dùng biết cần sửa ở đâu và sửa theo hướng nào.
- Nếu tài liệu đã ổn ở một phần nào đó, nói rõ phần đó ổn và không cần chỉnh nhiều.
- Ưu tiên cấu trúc câu trả lời:
  1. Tổng quan
  2. Các điểm cần chỉnh sửa
  3. Các phần nên viết tốt hơn
  4. Ưu tiên xử lý
- Khi nhắc tới chỉnh sửa, ghi rõ mục tài liệu nếu có, ví dụ: Mục 2 - Phạm vi, Mục 5 - Trách nhiệm.`

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { instruction, current_content, doc_type, title, history, analysis_only } = await request.json().catch(() => ({}))

  if (!instruction?.trim()) {
    return NextResponse.json({ error: 'Vui lòng nhập yêu cầu' }, { status: 400 })
  }

  const docTypeLabel = DOC_TYPE_LABELS[doc_type] ?? doc_type ?? ''

  // Build context message
  let contextParts: string[] = []
  if (title) contextParts.push(`Tên tài liệu: ${title}`)
  if (docTypeLabel) contextParts.push(`Loại: ${docTypeLabel}`)
  contextParts.push('Phạm vi: áp dụng toàn công ty; bộ phận chỉ là đơn vị chịu trách nhiệm khi được chọn.')

  if (current_content?.trim()) {
    contextParts.push(`\nNội dung hiện tại:\n---\n${current_content}\n---`)
  } else {
    contextParts.push('\nTài liệu hiện tại: (trống — cần tạo mới)')
  }

  const contextMessage = contextParts.join('\n')

  // Build messages array from history
  const messages: Anthropic.MessageParam[] = []

  // First message includes context
  messages.push({ role: 'user', content: contextMessage + '\n\nYêu cầu: ' + ((history?.length > 0) ? history[0].content : instruction) })

  // Add remaining history pairs
  if (history?.length > 0) {
    for (let i = 0; i < history.length; i++) {
      const msg = history[i]
      if (i === 0) continue // already included above
      messages.push({ role: msg.role, content: msg.content })
    }
    // Add new instruction as the latest user message
    messages.push({ role: 'user', content: instruction })
  }

  try {
    const analysisOnly = Boolean(analysis_only) || isAnalysisOnlyRequest(instruction)
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: analysisOnly ? 1800 : 3000,
      system: analysisOnly ? ANALYSIS_SYSTEM_PROMPT : SYSTEM_PROMPT,
      messages,
    })

    const raw = anthropicText(response)

    if (analysisOnly) {
      return NextResponse.json({
        explanation: cleanAiText(raw) || 'AI chưa trả về nội dung phân tích. Vui lòng thử lại.',
        proposed_content: '',
      })
    }

    const parsed = parseAiJson(raw)
    const explanation = formatExplanation(parsed?.explanation ?? extractJsonStringField(raw, 'explanation') ?? cleanAiText(raw))
    const proposed_content = shouldReturnProposedContent(instruction)
      ? normalizeDocumentMarkdown(parsed?.proposed_content ?? '')
      : ''

    return NextResponse.json({ explanation, proposed_content })
  } catch (err) {
    console.error('AI chat error:')
    return NextResponse.json({ error: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' }, { status: 500 })
  }
}

function parseAiJson(raw: string): { explanation?: string; proposed_content?: string } | null {
  const cleaned = cleanAiText(raw)
  const candidates = [
    cleaned,
    extractBetween(cleaned, '{', '}'),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // Try next candidate.
    }
  }

  return null
}

function extractJsonStringField(raw: string, field: string) {
  const source = cleanAiText(raw)
  const key = `"${field}"`
  const keyIndex = source.indexOf(key)
  if (keyIndex < 0) return ''

  const colonIndex = source.indexOf(':', keyIndex + key.length)
  if (colonIndex < 0) return ''

  const firstQuote = source.indexOf('"', colonIndex + 1)
  if (firstQuote < 0) return ''

  let escaped = false
  for (let i = firstQuote + 1; i < source.length; i++) {
    const char = source[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      const rawValue = source.slice(firstQuote + 1, i)
      try {
        return JSON.parse(`"${rawValue}"`)
      } catch {
        return rawValue.replace(/\\n/g, '\n').replace(/\\"/g, '"')
      }
    }
  }

  return ''
}

function formatExplanation(value: string) {
  const cleaned = cleanAiText(value)
  if (!cleaned) return 'AI đã chuẩn bị bản chỉnh sửa.'
  if (!cleaned.includes('"proposed_content"')) return cleaned

  return extractJsonStringField(cleaned, 'explanation') || 'AI đã chuẩn bị bản chỉnh sửa. Bấm Áp dụng để đưa nội dung vào tài liệu.'
}

function shouldReturnProposedContent(instruction: string) {
  return asksToChangeDocument(instruction) && !isAnalysisOnlyRequest(instruction)
}

function asksToChangeDocument(instruction: string) {
  const text = instruction.toLowerCase()
  return [
    'viết lại',
    'viet lai',
    'chỉnh',
    'chinh',
    'sửa',
    'sua',
    'thêm',
    'them',
    'tạo',
    'tao',
    'bổ sung',
    'bo sung',
    'áp dụng',
    'ap dung',
    'rewrite',
    'update',
    'create',
  ].some(keyword => text.includes(keyword))
}

function isAnalysisOnlyRequest(instruction: string) {
  const text = instruction
    .toLowerCase()
    .replace(/không\s+viết\s+lại/g, '')
    .replace(/khong\s+viet\s+lai/g, '')
    .replace(/không\s+tự\s+áp\s+dụng/g, '')
    .replace(/khong\s+tu\s+ap\s+dung/g, '')
    .replace(/không\s+áp\s+dụng/g, '')
    .replace(/khong\s+ap\s+dung/g, '')
  const asksForAnalysis = [
    'phân tích',
    'phan tich',
    'đánh giá',
    'danh gia',
    'nhận xét',
    'nhan xet',
    'chỉ ra',
    'chi ra',
    'kiểm tra',
    'kiem tra',
    'review',
    'analyze',
  ].some(keyword => text.includes(keyword))

  const asksToApplyChange = [
    'áp dụng',
    'ap dung',
    'cập nhật vào',
    'cap nhat vao',
    'sửa luôn',
    'sua luon',
    'chỉnh luôn',
    'chinh luon',
    'viết lại',
    'viet lai',
    'rewrite',
    'update the document',
  ].some(keyword => text.includes(keyword))

  return asksForAnalysis && !asksToApplyChange
}

function cleanAiText(raw: string) {
  return raw
    .trim()
    .replace(/^`{2,3}\s*json\s*/i, '')
    .replace(/^`{2,3}\s*/i, '')
    .replace(/`{2,3}\s*$/i, '')
    .trim()
}

function extractBetween(value: string, start: string, end: string) {
  const first = value.indexOf(start)
  const last = value.lastIndexOf(end)
  if (first < 0 || last <= first) return ''
  return value.slice(first, last + 1)
}
