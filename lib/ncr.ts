import type { SupabaseClient } from '@supabase/supabase-js'

export const NCR_COLUMNS = [
  { status: 'open',                   label: 'Mới mở',             color: 'border-gray-300' },
  { status: 'analysing',              label: 'Phân tích & CAPA',   color: 'border-blue-300' },
  { status: 'pending_capa_approval',  label: 'Chờ duyệt CAPA',     color: 'border-yellow-300' },
  { status: 'implementing',           label: 'Đang thực hiện',     color: 'border-purple-300' },
  { status: 'pending_verification',   label: 'Chờ xác nhận',       color: 'border-orange-300' },
  { status: 'completed',              label: 'Hoàn thành',         color: 'border-green-300' },
] as const

export const SEVERITY_LABELS: Record<string, string> = {
  minor:    'Nhỏ',
  major:    'Lớn',
  critical: 'Nghiêm trọng',
}

export const SEVERITY_COLORS: Record<string, string> = {
  minor:    'bg-yellow-100 text-yellow-700',
  major:    'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export const ISO_CLAUSES = [
  '4.1 – Bối cảnh tổ chức',
  '4.2 – Các bên quan tâm',
  '4.3 – Phạm vi hệ thống',
  '4.4 – Hệ thống quản lý chất lượng',
  '5.1 – Lãnh đạo và cam kết',
  '5.2 – Chính sách chất lượng',
  '5.3 – Vai trò và trách nhiệm',
  '6.1 – Rủi ro và cơ hội',
  '6.2 – Mục tiêu chất lượng',
  '6.3 – Hoạch định thay đổi',
  '7.1 – Nguồn lực',
  '7.2 – Năng lực',
  '7.3 – Nhận thức',
  '7.4 – Trao đổi thông tin',
  '7.5 – Thông tin dạng văn bản',
  '8.1 – Hoạch định và kiểm soát vận hành',
  '8.2 – Yêu cầu sản phẩm và dịch vụ',
  '8.3 – Thiết kế và phát triển',
  '8.4 – Kiểm soát quá trình bên ngoài',
  '8.5 – Sản xuất và cung cấp dịch vụ',
  '8.6 – Thả sản phẩm và dịch vụ',
  '8.7 – Kiểm soát đầu ra không phù hợp',
  '9.1 – Theo dõi, đo lường, phân tích',
  '9.2 – Đánh giá nội bộ',
  '9.3 – Xem xét của lãnh đạo',
  '10.1 – Cải tiến chung',
  '10.2 – Sự không phù hợp và hành động khắc phục',
  '10.3 – Cải tiến liên tục',
]

export async function generateNcrCode(
  supabase: SupabaseClient,
  factoryCode: string
): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `NCR-${factoryCode}-${year}-`

  const { data } = await supabase
    .from('ncrs')
    .select('ncr_code')
    .like('ncr_code', `${prefix}%`)

  const seqs = data?.map(n => parseInt(n.ncr_code.replace(prefix, '')) || 0) ?? []
  const next = seqs.length > 0 ? Math.max(...seqs) + 1 : 1
  return `${prefix}${next.toString().padStart(3, '0')}`
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null
  const diff = new Date(dueDate).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}
