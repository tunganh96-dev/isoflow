import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

// POST /api/settings/departments — create department
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { name, code, factory_id, exclude_from_cross_audit } = await request.json().catch(() => ({}))

  if (!name || !code) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  let targetFactoryId = factory_id ?? null
  if (!targetFactoryId) {
    const { data: defaultFactory } = await supabase
      .from('factories')
      .select('id')
      .eq('code', 'QVO')
      .maybeSingle()

    if (defaultFactory?.id) {
      targetFactoryId = defaultFactory.id
    } else {
      const { data: firstFactory } = await supabase
        .from('factories')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      targetFactoryId = firstFactory?.id ?? null
    }
  }

  const { data, error } = await supabase
    .from('departments')
    .insert({ name, code, factory_id: targetFactoryId, exclude_from_cross_audit: exclude_from_cross_audit ?? false })
    .select()
    .single()

  if (error) {
    console.error('Create department error:')
    return NextResponse.json({ error: 'Không thể tạo bộ phận' }, { status: 500 })
  }

  return NextResponse.json({ department: data }, { status: 201 })
}
