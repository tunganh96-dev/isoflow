import type { ControlFrequency, CrossAuditFrequency } from '@/lib/learning-assets'

export type ProcessImportanceLevel = 1 | 2 | 3 | 4 | 5

export const PROCESS_IMPORTANCE_LABELS: Record<ProcessImportanceLevel, string> = {
  1: 'Level 1 - Ít quan trọng',
  2: 'Level 2 - Thấp',
  3: 'Level 3 - Trung bình',
  4: 'Level 4 - Quan trọng',
  5: 'Level 5 - Rất quan trọng',
}

export const PROCESS_IMPORTANCE_DESCRIPTIONS: Record<ProcessImportanceLevel, string> = {
  1: 'Quy trình tham khảo hoặc rủi ro thấp, không cần kiểm tra thường xuyên.',
  2: 'Quy trình hỗ trợ, ít ảnh hưởng trực tiếp đến chất lượng/truy xuất.',
  3: 'Quy trình ISO thông thường, cần kiểm soát định kỳ.',
  4: 'Quy trình quan trọng, có điểm kiểm soát ảnh hưởng chất lượng/vận hành.',
  5: 'Quy trình trọng yếu, ảnh hưởng trực tiếp đến chất lượng, khách hàng, an toàn hoặc truy xuất.',
}

export function normalizeImportanceLevel(value: unknown): ProcessImportanceLevel {
  const parsed = Number(value)
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5) return parsed
  return 3
}

export function frequenciesForImportance(level: ProcessImportanceLevel): {
  worker: ControlFrequency
  manager: ControlFrequency
  crossAudit: CrossAuditFrequency
} {
  if (level === 5) return { worker: 'daily', manager: 'daily', crossAudit: 'monthly' }
  if (level === 4) return { worker: 'daily', manager: 'weekly', crossAudit: 'monthly' }
  if (level === 3) return { worker: 'weekly', manager: 'weekly', crossAudit: 'quarterly' }
  if (level === 2) return { worker: 'monthly', manager: 'monthly', crossAudit: 'quarterly' }
  return { worker: 'monthly', manager: 'monthly', crossAudit: 'none' }
}

export function recommendedQuizQuestionsForImportance(level: ProcessImportanceLevel) {
  if (level === 5) return 6
  if (level === 4) return 5
  if (level === 3) return 4
  if (level === 2) return 3
  return 2
}
