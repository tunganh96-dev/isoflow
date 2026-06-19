import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'
import { normalizeDocumentMarkdown } from '@/lib/markdown'

async function requireSettingsAccess() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return { supabase, user, error: NextResponse.json({ error: 'Không có quyền' }, { status: 403 }) }
  }

  return { supabase, user, error: null }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, error: accessError } = await requireSettingsAccess()
  if (accessError) return accessError

  const { name, doc_type, content, is_active } = await request.json().catch(() => ({}))
  const { data, error } = await supabase
    .from('document_templates')
    .update({
      name,
      doc_type,
      content: normalizeDocumentMarkdown(content ?? ''),
      is_active: is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Không thể cập nhật mẫu' }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, error: accessError } = await requireSettingsAccess()
  if (accessError) return accessError

  const { error } = await supabase.from('document_templates').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: 'Không thể xóa mẫu' }, { status: 500 })
  return NextResponse.json({ success: true })
}
