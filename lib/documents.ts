import type { SupabaseClient } from '@supabase/supabase-js'

export const DOC_TYPE_CODES: Record<string, string> = {
  sop: 'QT',
  work_instruction: 'HD',
  quality_policy: 'CS',
  audit_checklist: 'BKT',
  ncr_report: 'NCR',
  capa_report: 'CAPA',
  risk_register: 'RR',
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  sop: 'Quy trình',
  work_instruction: 'Hướng dẫn công việc',
  quality_policy: 'Chính sách chất lượng',
  audit_checklist: 'Bảng kiểm tra',
  ncr_report: 'Phiếu không phù hợp',
  capa_report: 'Hành động khắc phục',
  risk_register: 'Sổ rủi ro',
}

export const DOC_STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  pending_approval: 'Chờ phê duyệt',
  published: 'Đã xuất bản',
  under_review: 'Đang xem xét',
  archived: 'Đã lưu trữ',
}

export const DOC_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  under_review: 'bg-orange-100 text-orange-700',
  archived: 'bg-gray-100 text-gray-400',
}

// Doc types that get Mermaid flowcharts
export const FLOWCHART_TYPES = ['sop', 'work_instruction']

export async function generateDocCode(
  supabase: SupabaseClient,
  docType: string,
  factoryCode: string | null,
  isAddendum: boolean
): Promise<string> {
  const typeCode = DOC_TYPE_CODES[docType]

  if (!factoryCode) {
    // Master doc: QT-001
    const seq = await getNextSeq(supabase, `${typeCode}-`, false)
    return `${typeCode}-${seq.toString().padStart(3, '0')}`
  }

  if (isAddendum) {
    // Addendum: QT-QVO-001-ADD
    const seq = await getNextSeq(supabase, `${typeCode}-${factoryCode}-`, true)
    return `${typeCode}-${factoryCode}-${seq.toString().padStart(3, '0')}-ADD`
  }

  // Factory doc: QT-QVO-001
  const seq = await getNextSeq(supabase, `${typeCode}-${factoryCode}-`, false)
  return `${typeCode}-${factoryCode}-${seq.toString().padStart(3, '0')}`
}

async function getNextSeq(
  supabase: SupabaseClient,
  prefix: string,
  isAddendum: boolean
): Promise<number> {
  const { data } = await supabase
    .from('documents')
    .select('doc_code')
    .like('doc_code', `${prefix}%`)

  if (!data || data.length === 0) return 1

  const seqs = data
    .map(d => {
      // Strip prefix, get numeric part
      const rest = d.doc_code.replace(prefix, '').split('-')[0]
      return parseInt(rest) || 0
    })
    .filter(n => !isNaN(n))

  return seqs.length > 0 ? Math.max(...seqs) + 1 : 1
}

// When archiving, rename doc_code to include version suffix
export function archivedDocCode(docCode: string, version: number): string {
  return `${docCode}-v${version}`
}
