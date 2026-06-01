import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { archivedDocCode } from '@/lib/documents'

// POST /api/documents/[id]/version — create new version from a published document
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['qa_employee', 'qa_manager'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { data: doc } = await supabase.from('documents').select('*').eq('id', params.id).single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'published') return NextResponse.json({ error: 'Chỉ có thể tạo phiên bản mới từ tài liệu đã xuất bản' }, { status: 400 })

  // Archive current version — rename doc_code to include version suffix
  await supabase
    .from('documents')
    .update({
      status: 'archived',
      doc_code: archivedDocCode(doc.doc_code, doc.version),
    })
    .eq('id', params.id)

  // Create new draft with incremented version and original doc_code
  const { data: newDoc, error } = await supabase
    .from('documents')
    .insert({
      doc_code: doc.doc_code,
      title: doc.title,
      doc_type: doc.doc_type,
      content: doc.content,
      mermaid_code: doc.mermaid_code,
      version: doc.version + 1,
      status: 'draft',
      factory_id: doc.factory_id,
      parent_doc_id: doc.parent_doc_id,
      is_addendum: doc.is_addendum,
      owner_id: user.id,
      source_file_url: doc.source_file_url,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Không thể tạo phiên bản mới' }, { status: 500 })

  return NextResponse.json({ document: newDoc }, { status: 201 })
}
