import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'
import { normalizeDocumentMarkdown } from '@/lib/markdown'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { name, doc_type, content, is_active } = await request.json().catch(() => ({}))
  if (!name || !doc_type || !content) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('document_templates')
    .insert({
      name,
      doc_type,
      content: normalizeDocumentMarkdown(content),
      is_active: is_active ?? true,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Create template error:')
    return NextResponse.json({ error: 'Không thể tạo mẫu' }, { status: 500 })
  }

  return NextResponse.json({ template: data }, { status: 201 })
}
