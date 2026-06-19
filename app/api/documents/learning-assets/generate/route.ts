import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DOC_TYPE_LABELS } from '@/lib/documents'
import { ANTHROPIC_MODEL, anthropicText } from '@/lib/anthropic'
import { canCreateQualityRecord } from '@/lib/roles'
import { normalizeLearningAssets } from '@/lib/learning-assets'
import { DEFAULT_LEARNING_ASSETS_PROMPT, LEARNING_ASSETS_PROMPT_KEY, getAiPrompt } from '@/lib/ai-prompt-library'
import { normalizeImportanceLevel, recommendedQuizQuestionsForImportance } from '@/lib/process-importance'

const client = new Anthropic()

const LEARNING_ASSETS_TOOL: Anthropic.Tool = {
  name: 'save_learning_assets',
  description: 'Lưu summary card, quiz, worker verification, manager confirmation và monthly audit checklist đã tạo hoặc cập nhật.',
  input_schema: {
    type: 'object',
    properties: {
      summary_card: {
        type: 'object',
        properties: {
          purpose: { type: 'string' },
          responsibilities: { type: 'array', items: { type: 'string' } },
          critical_steps: { type: 'array', items: { type: 'string' } },
          hard_rules: { type: 'array', items: { type: 'string' } },
          required_records: { type: 'array', items: { type: 'string' } },
        },
        required: ['purpose', 'responsibilities', 'critical_steps', 'hard_rules', 'required_records'],
      },
      quiz: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            correct_answer: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' },
          },
          required: ['question', 'options', 'correct_answer', 'explanation'],
        },
      },
      worker_verification: {
        type: 'object',
        properties: {
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                instruction: { type: 'string' },
              },
              required: ['item', 'instruction'],
            },
          },
        },
        required: ['frequency', 'items'],
      },
      manager_confirmation: {
        type: 'object',
        properties: {
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                instruction: { type: 'string' },
              },
              required: ['item', 'instruction'],
            },
          },
        },
        required: ['frequency', 'items'],
      },
      cross_audit_frequency: { type: 'string', enum: ['none', 'monthly', 'quarterly'] },
      audit_checklist: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string' },
            check_method: { type: 'string' },
            pass_criteria: { type: 'string' },
            fail_criteria: { type: 'string' },
          },
          required: ['item', 'check_method', 'pass_criteria', 'fail_criteria'],
        },
      },
    },
    required: ['summary_card', 'quiz', 'worker_verification', 'manager_confirmation', 'cross_audit_frequency', 'audit_checklist'],
  },
}

const OUTPUT_CONTRACT = `BẮT BUỘC: Dù prompt tùy chỉnh phía trên yêu cầu cách trình bày nào, kết quả cuối cùng phải là JSON hợp lệ theo cấu trúc sau:
{
  "summary_card": {
    "purpose": "1 câu ngắn",
    "responsibilities": ["Vai trò: trách nhiệm"],
    "critical_steps": ["Bước quan trọng và hậu quả nếu bỏ qua"],
    "hard_rules": ["Điều tuyệt đối không được làm"],
    "required_records": ["Mã/tên hồ sơ và thời điểm cần điền"]
  },
  "quiz": [
    {
      "question": "Câu hỏi tình huống",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "Giải thích"
    }
  ],
  "worker_verification": {
    "frequency": "daily|weekly|monthly",
    "items": [
      {
        "item": "Câu xác nhận cho nhân viên thực hiện",
        "instruction": "Nhân viên trả lời Yes/No/N/A cho toàn bộ công việc trong kỳ; nếu No thì ghi lý do"
      }
    ]
  },
  "manager_confirmation": {
    "frequency": "daily|weekly|monthly",
    "items": [
      {
        "item": "Câu xác nhận cho quản lý trực tiếp",
        "instruction": "Quản lý kiểm tra checklist nhân viên, lý do No và quyết định có cần hành động/NCR không"
      }
    ]
  },
  "cross_audit_frequency": "none|monthly|quarterly",
  "audit_checklist": [
    {
      "item": "Critical step cần kiểm tra",
      "check_method": "Cách kiểm tra cụ thể",
      "pass_criteria": "Dấu hiệu đạt",
      "fail_criteria": "Dấu hiệu không đạt"
    }
  ]
}
Chỉ trả JSON. Không trả danh sách prompt, không trả markdown, không giải thích ngoài JSON.`

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, doc_type, content, document_id, current_assets, process_importance_level } = await request.json().catch(() => ({}))
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const { data: doc } = document_id
    ? await supabase.from('documents').select('owner_id, status, process_importance_level').eq('id', document_id).single()
    : { data: null }
  const canGenerate = canCreateQualityRecord(profile?.role) || doc?.owner_id === user.id

  if (!canGenerate) {
    return NextResponse.json({ error: 'Không có quyền tạo nội dung đào tạo' }, { status: 403 })
  }

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Nội dung tài liệu không được để trống' }, { status: 400 })
  }

  try {
    const importanceLevel = normalizeImportanceLevel(process_importance_level ?? doc?.process_importance_level)
    const requiredQuizCount = recommendedQuizQuestionsForImportance(importanceLevel)
    const systemPrompt = await getAiPrompt(supabase, LEARNING_ASSETS_PROMPT_KEY, DEFAULT_LEARNING_ASSETS_PROMPT)
    const existingAssets = current_assets ? normalizeLearningAssets(current_assets) : null
    const revisionInstruction = existingAssets && hasUsableAssets(existingAssets)
      ? `\n\nNỘI DUNG AI HIỆN TẠI:\n${JSON.stringify(existingAssets, null, 2)}

Đây là lần cập nhật lại. Hãy giữ nguyên các nội dung hiện tại vẫn đúng và vẫn phù hợp với tài liệu.
Chỉ sửa, thêm hoặc xóa những phần thực sự cần thiết do nội dung quy trình hiện tại thay đổi.
Không viết lại toàn bộ theo cách diễn đạt khác chỉ để làm mới câu chữ.
Riêng phần quiz là ngoại lệ: phải điều chỉnh để có đúng ${requiredQuizCount} câu hỏi theo mức quan trọng hiện tại. Nếu quiz hiện tại ít hơn ${requiredQuizCount} câu, hãy bổ sung câu mới thay vì giữ nguyên số câu cũ.`
      : ''

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 12000,
      system: `${systemPrompt}\n\nTrả lời bằng tiếng Việt có đầy đủ dấu.\n\n${OUTPUT_CONTRACT}`,
      tools: [LEARNING_ASSETS_TOOL],
      tool_choice: { type: 'tool', name: LEARNING_ASSETS_TOOL.name },
      messages: [{
        role: 'user',
        content: `Tên tài liệu: ${title ?? ''}\nLoại tài liệu: ${DOC_TYPE_LABELS[doc_type] ?? doc_type ?? ''}\nMức quan trọng quy trình: Level ${importanceLevel}\nSố câu quiz bắt buộc: ${requiredQuizCount}\n\nBẮT BUỘC: trường "quiz" phải có đúng ${requiredQuizCount} câu hỏi. Không trả ít hơn hoặc nhiều hơn.\n\nNội dung:\n---\n${content}\n---${revisionInstruction}`,
      }],
    })

    const toolResult = response.content.find(block => block.type === 'tool_use' && block.name === LEARNING_ASSETS_TOOL.name)
    let parsed = toolResult?.type === 'tool_use' ? toolResult.input : null

    if (!parsed) {
      const raw = anthropicText(response)
      parsed = parseJson(raw)
      if (!parsed) parsed = await repairJson(raw)
    }

    if (!parsed) {
      console.error('Learning assets structured output missing:')
      return NextResponse.json({ error: 'AI không trả về đúng định dạng. Vui lòng thử lại.' }, { status: 502 })
    }

    console.log('AI stop_reason:', response.stop_reason, 'output tokens:', response.usage?.output_tokens)
    console.log('Raw keys:', Object.keys(parsed as any))
    console.log('Raw audit_checklist:', JSON.stringify((parsed as any)?.audit_checklist ?? 'MISSING').slice(0, 200))
    let assets = normalizeLearningAssets(parsed)
    if (assets.quiz.length !== requiredQuizCount) {
      assets = await adjustQuizCount(assets, requiredQuizCount, content) ?? assets
    }
    if (assets.quiz.length > requiredQuizCount) {
      assets = { ...assets, quiz: assets.quiz.slice(0, requiredQuizCount) }
    }
    if (!hasUsableAssets(assets)) {
      console.error('Learning assets normalized to empty:')
      return NextResponse.json({
        error: 'AI đã trả kết quả nhưng không có summary/audit đúng cấu trúc. Hãy kiểm tra prompt document_learning_assets.',
      }, { status: 502 })
    }

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Generate learning assets error:')
    return NextResponse.json({ error: 'Không thể tạo nội dung đào tạo. Vui lòng thử lại.' }, { status: 500 })
  }
}

function hasUsableAssets(assets: ReturnType<typeof normalizeLearningAssets>) {
  return Boolean(
    assets.summary_card.purpose
    || assets.summary_card.responsibilities.length
    || assets.summary_card.critical_steps.length
    || assets.quiz.length
    || assets.worker_verification.items.length
    || assets.manager_confirmation.items.length
    || assets.audit_checklist.length
  )
}

async function adjustQuizCount(assets: ReturnType<typeof normalizeLearningAssets>, requiredQuizCount: number, content: string) {
  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 5000,
      system: `Bạn chỉnh JSON nội dung đào tạo ISO. Trả lời bằng tiếng Việt có đầy đủ dấu. Giữ nguyên summary_card, worker_verification, manager_confirmation, cross_audit_frequency và audit_checklist. Chỉ chỉnh trường quiz để có đúng ${requiredQuizCount} câu hỏi tình huống thực tế. Nếu thiếu thì thêm câu mới dựa trên tài liệu. Nếu dư thì giữ ${requiredQuizCount} câu tốt nhất. Chỉ dùng tool.`,
      tools: [LEARNING_ASSETS_TOOL],
      tool_choice: { type: 'tool', name: LEARNING_ASSETS_TOOL.name },
      messages: [{
        role: 'user',
        content: `JSON hiện tại:\n${JSON.stringify(assets, null, 2)}\n\nTài liệu gốc:\n---\n${content}\n---\n\nYêu cầu: trả lại đầy đủ JSON theo schema, với quiz có đúng ${requiredQuizCount} câu.`,
      }],
    })

    const toolResult = response.content.find(block => block.type === 'tool_use' && block.name === LEARNING_ASSETS_TOOL.name)
    if (toolResult?.type !== 'tool_use') return null
    const normalized = normalizeLearningAssets(toolResult.input)
    return normalized.quiz.length ? normalized : null
  } catch (error) {
    console.error('Adjust quiz count error:')
    return null
  }
}

async function repairJson(raw: string) {
  if (!raw.trim()) return null

  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2500,
      system: 'Bạn chỉ chuyển nội dung người dùng đưa thành JSON hợp lệ theo schema đã có. Trả lời bằng tiếng Việt có đầy đủ dấu. Chỉ trả JSON, không giải thích, không code fence.',
      messages: [{
        role: 'user',
        content: `Chuyển nội dung sau thành JSON hợp lệ với các key: summary_card, quiz, worker_verification, manager_confirmation, audit_checklist. Giữ nguyên ý chính, sửa lỗi dấu phẩy/quote nếu có.\n\n${raw}`,
      }],
    })

    return parseJson(anthropicText(response))
  } catch (error) {
    console.error('Repair learning assets JSON error:')
    return null
  }
}

function parseJson(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^`{2,3}\s*json\s*/i, '')
    .replace(/^`{2,3}\s*/i, '')
    .replace(/`{2,3}\s*$/i, '')
    .trim()

  const candidates = [
    cleaned,
    extractJsonObject(cleaned),
    extractBetween(cleaned, '{', '}'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // Try next candidate.
    }
  }

  return null
}

function extractJsonObject(value: string) {
  const start = value.indexOf('{')
  if (start < 0) return ''

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < value.length; i++) {
    const char = value[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) return value.slice(start, i + 1)
  }

  return ''
}

function extractBetween(value: string, start: string, end: string) {
  const first = value.indexOf(start)
  const last = value.lastIndexOf(end)
  if (first < 0 || last <= first) return ''
  return value.slice(first, last + 1)
}
