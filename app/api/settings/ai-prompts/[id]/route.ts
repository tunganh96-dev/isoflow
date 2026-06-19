import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

async function requirePromptAdmin() {
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
  const { supabase, error } = await requirePromptAdmin()
  if (error) return error

  const { name, description, content, is_active } = await request.json().catch(() => ({}))
  if (!name || !content) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const { data, error: updateError } = await supabase
    .from('ai_prompts')
    .update({
      name,
      description: description ?? null,
      content,
      is_active: is_active ?? true,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    console.error('Update AI prompt error:')
    return NextResponse.json({ error: promptErrorMessage(updateError, 'Không thể cập nhật prompt') }, { status: 500 })
  }

  return NextResponse.json({ prompt: data })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requirePromptAdmin()
  if (error) return error

  const { error: deleteError } = await supabase.from('ai_prompts').delete().eq('id', params.id)
  if (deleteError) {
    console.error('Delete AI prompt error:')
    return NextResponse.json({ error: promptErrorMessage(deleteError, 'Không thể xóa prompt') }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

function promptErrorMessage(error: { code?: string; message?: string }, fallback: string) {
  if (error.code === '42P01' || error.message?.includes('ai_prompts')) {
    return 'Chưa tạo bảng ai_prompts trong Supabase. Vui lòng chạy migration 20260603_ai_prompts.sql.'
  }
  return process.env.NODE_ENV === 'development' ? `${fallback}: ${error.message}` : fallback
}
