import type { SupabaseClient } from '@supabase/supabase-js'

export interface DocumentTemplate {
  id: string
  name: string
  doc_type: string
  content: string
  is_active: boolean
}

export async function getActiveDocumentTemplate(
  supabase: SupabaseClient,
  docType: string | null | undefined
) {
  if (!docType) return null

  const { data } = await supabase
    .from('document_templates')
    .select('id, name, doc_type, content, is_active')
    .eq('doc_type', docType)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as DocumentTemplate | null
}

export function templatePrompt(template: DocumentTemplate | null) {
  if (!template?.content?.trim()) return ''

  return `\n\nMẪU TÀI LIỆU CÔNG TY BẮT BUỘC ÁP DỤNG:\nTên mẫu: ${template.name}\n---\n${template.content}\n---\nYêu cầu: Bám sát cấu trúc, heading, bảng, header/footer và cách trình bày của mẫu trên. Không tự tạo format khác nếu mẫu đã quy định.`
}
