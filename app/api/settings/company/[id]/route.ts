import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'
import type { Database } from '@/types/supabase'

type FactoryUpdate = Database['public']['Tables']['factories']['Update']

// PATCH /api/settings/company/[id] — update factory
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { name, code } = await request.json().catch(() => ({}))
  const updates: FactoryUpdate = {}
  if (name !== undefined) updates.name = name
  if (code !== undefined) updates.code = code

  const { error } = await supabase.from('factories').update(updates).eq('id', params.id)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Mã nhà máy đã tồn tại' }, { status: 400 })
    }
    console.error('Update factory error:')
    return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
