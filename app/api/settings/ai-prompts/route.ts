import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { key, name, description, content, is_active } = await request.json().catch(() => ({}))
  if (!key || !name || !content) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ai_prompts')
    .upsert({
      key,
      name,
      description: description ?? null,
      content,
      is_active: is_active ?? true,
      created_by: user.id,
    }, { onConflict: 'key' })
    .select()
    .single()

  if (error) {
    console.error('Save AI prompt error:')
    return NextResponse.json({ error: promptErrorMessage(error, 'Không thể lưu prompt') }, { status: 500 })
  }

  return NextResponse.json({ prompt: data })
}

function promptErrorMessage(error: { code?: string; message?: string }, fallback: string) {
  if (error.code === '42P01' || error.message?.includes('ai_prompts')) {
    return 'Chưa tạo bảng ai_prompts trong Supabase. Vui lòng chạy migration 20260603_ai_prompts.sql.'
  }
  return process.env.NODE_ENV === 'development' ? `${fallback}: ${error.message}` : fallback
}
