import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { canApproveQualityRecord } from '@/lib/roles'

// POST /api/documents/[id]/reject
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canApproveQualityRecord(profile?.role)) return NextResponse.json({ error: 'Không có quyền từ chối' }, { status: 403 })

  const { data: doc } = await supabase
    .from('documents')
    .select('status, owner_id, title, doc_code')
    .eq('id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'pending_approval') return NextResponse.json({ error: 'Tài liệu không ở trạng thái chờ phê duyệt' }, { status: 400 })

  const { notes } = await request.json().catch(() => ({}))
  if (!notes?.trim()) return NextResponse.json({ error: 'Vui lòng nhập lý do từ chối' }, { status: 400 })

  const { error } = await supabase
    .from('documents')
    .update({ status: 'draft' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể từ chối tài liệu' }, { status: 500 })

  await createNotification(
    supabase,
    doc.owner_id,
    'Tài liệu bị từ chối',
    `"${doc.title}" (${doc.doc_code}) bị từ chối. Lý do: ${notes}`,
    `/documents/${params.id}`
  )

  return NextResponse.json({ success: true })
}
