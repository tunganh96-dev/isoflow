import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { document_ids } = await request.json().catch(() => ({}))
  const documentIds = Array.isArray(document_ids)
    ? Array.from(new Set(document_ids.filter((id): id is string => typeof id === 'string' && Boolean(id))))
    : []

  const { error: deleteError } = await supabase
    .from('job_position_processes')
    .delete()
    .eq('job_position_id', params.id)
  if (deleteError) return NextResponse.json({ error: 'Không thể cập nhật quy trình' }, { status: 500 })

  if (documentIds.length) {
    const { error: insertError } = await supabase.from('job_position_processes').insert(
      documentIds.map(documentId => ({ job_position_id: params.id, document_id: documentId, included: true }))
    )
    if (insertError) return NextResponse.json({ error: 'Không thể cập nhật quy trình' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
