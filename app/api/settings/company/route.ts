import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

// POST /api/settings/company — create factory
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { name, code } = await request.json().catch(() => ({}))
  if (!name || !code) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('factories')
    .insert({ name, code })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Mã nhà máy đã tồn tại' }, { status: 400 })
    }
    console.error('Create factory error:')
    return NextResponse.json({ error: 'Không thể tạo nhà máy' }, { status: 500 })
  }

  return NextResponse.json({ factory: data }, { status: 201 })
}
