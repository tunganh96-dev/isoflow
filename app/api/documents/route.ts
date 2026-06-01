import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDocCode } from '@/lib/documents'

// POST /api/documents — create new document (saves as draft)
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile || !['qa_employee', 'qa_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Không có quyền tạo tài liệu' }, { status: 403 })
  }

  const body = await request.json()
  const { title, doc_type, content, mermaid_code, factory_id, is_addendum, parent_doc_id, source_file_url } = body

  if (!title || !doc_type || !content) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  // Resolve factory code for doc_code generation
  let factoryCode: string | null = null
  if (factory_id) {
    const { data: factory } = await supabase.from('factories').select('code').eq('id', factory_id).single()
    factoryCode = factory?.code ?? null
  }

  const doc_code = await generateDocCode(supabase, doc_type, factoryCode, is_addendum ?? false)

  const { data, error } = await supabase
    .from('documents')
    .insert({
      doc_code,
      title,
      doc_type,
      content,
      mermaid_code: mermaid_code ?? null,
      factory_id: factory_id ?? null,
      is_addendum: is_addendum ?? false,
      parent_doc_id: parent_doc_id ?? null,
      owner_id: user.id,
      source_file_url: source_file_url ?? null,
      status: 'draft',
      version: 1,
    })
    .select()
    .single()

  if (error) {
    console.error('Create document error:', error)
    return NextResponse.json({ error: 'Không thể tạo tài liệu' }, { status: 500 })
  }

  return NextResponse.json({ document: data }, { status: 201 })
}
