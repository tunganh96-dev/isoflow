export interface SummaryCard {
  purpose: string
  responsibilities: string[]
  critical_steps: string[]
  hard_rules: string[]
  required_records: string[]
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export interface AuditChecklistItem {
  item: string
  check_method: string
  pass_criteria: string
  fail_criteria: string
}

export type ControlFrequency = 'daily' | 'weekly' | 'monthly'
export type CrossAuditFrequency = 'none' | 'monthly' | 'quarterly'

export interface ControlChecklistItem {
  item: string
  instruction: string
}

export interface ControlChecklist {
  frequency: ControlFrequency
  items: ControlChecklistItem[]
}

export interface DocumentLearningAssets {
  summary_card: SummaryCard
  quiz: QuizQuestion[]
  worker_verification: ControlChecklist
  manager_confirmation: ControlChecklist
  cross_audit_frequency: CrossAuditFrequency
  audit_checklist: AuditChecklistItem[]
}

export const MAX_QUIZ_QUESTIONS = 10

export const EMPTY_LEARNING_ASSETS: DocumentLearningAssets = {
  summary_card: {
    purpose: '',
    responsibilities: [],
    critical_steps: [],
    hard_rules: [],
    required_records: [],
  },
  quiz: [],
  worker_verification: {
    frequency: 'daily',
    items: [],
  },
  manager_confirmation: {
    frequency: 'daily',
    items: [],
  },
  cross_audit_frequency: 'monthly',
  audit_checklist: [],
}

export function normalizeLearningAssets(value: unknown): DocumentLearningAssets {
  const root = objectValue(value)
  const summary = objectValue(root.summary_card ?? root.summary ?? root)
  const quizContainer = objectValue(root.quiz)
  const workerContainer = root.worker_verification ?? root.sop_verification ?? root.execution_checklist ?? root.sop_verification_questions ?? root.worker_verification_questions
  const managerContainer = root.manager_confirmation ?? root.supervisor_confirmation ?? root.manager_checklist ?? root.manager_confirmation_questions
  const auditContainer = objectValue(root.audit_checklist)
  const quizSource = arrayValue(root.quiz).length
    ? arrayValue(root.quiz)
    : arrayValue(quizContainer.questions ?? root.questions)
  const auditSource = arrayValue(root.audit_checklist).length
    ? arrayValue(root.audit_checklist)
    : arrayValue(auditContainer.checklist_items ?? root.checklist_items ?? root.cross_audit_questions)

  return {
    summary_card: {
      purpose: stringValue(summary.purpose ?? summary.muc_dich),
      responsibilities: listValues(summary.responsibilities ?? summary.ai_lam_gi, responsibilityText),
      critical_steps: listValues(summary.critical_steps ?? summary.buoc_quan_trong, criticalStepText).slice(0, 5),
      hard_rules: listValues(summary.hard_rules ?? summary.dung_bao_gio),
      required_records: listValues(summary.required_records ?? summary.ho_so_can_dien, recordText),
    },
    quiz: quizSource
      .slice(0, MAX_QUIZ_QUESTIONS)
      .map(rawQuestion => {
        const question = objectValue(rawQuestion)
        return {
          question: stringValue(question.question ?? question.cau_hoi),
          options: optionValues(question.options ?? question.lua_chon).slice(0, 4),
          correct_answer: answerIndex(question.correct_answer ?? question.dap_an_dung),
          explanation: stringValue(question.explanation ?? question.giai_thich),
        }
      })
      .filter(question => question.question && question.options.length >= 2),
    worker_verification: normalizeControlChecklist(workerContainer, 'daily'),
    manager_confirmation: normalizeControlChecklist(managerContainer, 'daily'),
    cross_audit_frequency: crossAuditFrequencyValue(root.cross_audit_frequency ?? root.audit_frequency ?? auditContainer.frequency),
    audit_checklist: auditSource
      .map(normalizeAuditItem)
      .filter(item => item.item),
  }
}

function normalizeControlChecklist(value: unknown, defaultFrequency: ControlFrequency): ControlChecklist {
  const container = objectValue(value)
  const itemsSource = Array.isArray(value)
    ? value
    : arrayValue(container.items ?? container.checklist ?? container.tasks ?? container.questions)
  return {
    frequency: frequencyValue(container.frequency ?? container.tan_suat, defaultFrequency),
    items: itemsSource
      .map(normalizeControlItem)
      .filter(item => item.item),
  }
}

function normalizeControlItem(value: unknown): ControlChecklistItem {
  if (typeof value === 'string') return { item: value.trim(), instruction: '' }

  const item = objectValue(value)
  return {
    item: stringValue(item.item ?? item.question ?? item.task ?? item.hang_muc),
    instruction: instructionText(item),
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map(item => stringValue(item)).filter(Boolean)
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function listValues(value: unknown, formatter = stringValue) {
  return arrayValue(value).map(formatter).filter(Boolean)
}

function responsibilityText(value: unknown) {
  if (typeof value === 'string') return value.trim()
  const item = objectValue(value)
  return joinParts(stringValue(item.vai_tro ?? item.role), stringValue(item.trach_nhiem_chinh ?? item.responsibility))
}

function criticalStepText(value: unknown) {
  if (typeof value === 'string') return value.trim()
  const item = objectValue(value)
  const step = joinParts(stringValue(item.buoc ?? item.step), stringValue(item.mo_ta ?? item.description))
  const reason = stringValue(item.ly_do_quan_trong ?? item.reason)
  return reason ? `${step} - Nếu bỏ qua: ${reason}` : step
}

function recordText(value: unknown) {
  if (typeof value === 'string') return value.trim()
  const item = objectValue(value)
  return joinParts(stringValue(item.ma_form ?? item.form_code), stringValue(item.khi_nao ?? item.when))
}

function optionValues(value: unknown) {
  if (Array.isArray(value)) return stringArray(value)
  return Object.values(objectValue(value)).map(stringValue).filter(Boolean)
}

function frequencyValue(value: unknown, fallback: ControlFrequency): ControlFrequency {
  const normalized = stringValue(value).toLowerCase()
  if (['daily', 'hang ngay', 'hằng ngày', 'hàng ngày'].includes(normalized)) return 'daily'
  if (['weekly', 'hang tuan', 'hằng tuần', 'hàng tuần'].includes(normalized)) return 'weekly'
  if (['monthly', 'hang thang', 'hằng tháng', 'hàng tháng'].includes(normalized)) return 'monthly'
  return fallback
}

function crossAuditFrequencyValue(value: unknown): CrossAuditFrequency {
  const normalized = stringValue(value).toLowerCase()
  if (['none', 'khong', 'không', 'no'].includes(normalized)) return 'none'
  if (['quarterly', 'hang quy', 'hằng quý', 'hàng quý'].includes(normalized)) return 'quarterly'
  return 'monthly'
}

function normalizeAuditItem(value: unknown): AuditChecklistItem {
  if (typeof value === 'string') {
    const parts = value.split('|').map(part => part.trim())
    return {
      item: parts[0] ?? '',
      check_method: removeLabel(parts[1], 'Cách kiểm tra:'),
      pass_criteria: removeLabel(parts[2], 'Đạt khi:'),
      fail_criteria: removeLabel(parts[3], 'Không đạt khi:'),
    }
  }

  const item = objectValue(value)
  return {
    item: stringValue(item.item ?? item.question ?? item.hang_muc),
    check_method: stringValue(item.check_method ?? item.evidence_hint ?? item.cach_kiem_tra),
    pass_criteria: stringValue(item.pass_criteria ?? item.why_important ?? item.dau_hieu_dat),
    fail_criteria: stringValue(item.fail_criteria ?? item.dau_hieu_khong_dat),
  }
}

function instructionText(item: Record<string, unknown>) {
  const direct = stringValue(item.instruction ?? item.expected_check ?? item.huong_dan ?? item.cach_kiem_tra)
  if (direct) return direct

  const parts = [
    stringValue(item.why_important),
    stringValue(item.evidence_hint),
  ].filter(Boolean)
  return parts.join(' | ')
}

function removeLabel(value: string | undefined, label: string) {
  return (value ?? '').replace(new RegExp(`^${label}\\s*`, 'i'), '').trim()
}

function joinParts(first: string, second: string) {
  if (!first) return second
  if (!second) return first
  return `${first}: ${second}`
}

function answerIndex(value: unknown) {
  if (typeof value === 'string' && /^[A-D]$/i.test(value.trim())) {
    return value.trim().toUpperCase().charCodeAt(0) - 65
  }
  return clampAnswer(value)
}

function clampAnswer(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(3, Math.trunc(parsed)))
}
