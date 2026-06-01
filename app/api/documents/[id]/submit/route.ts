import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyManagers } from '@/lib/notifications'

// POST /api/documents/[id]/submit — submit draft for approval
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase.from('documents').select('*').eq('id', params.id).single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'draft') return NextResponse.json({ error: 'Chỉ có thể gửi tài liệu ở trạng thái bản nháp' }, { status: 400 })
  if (doc.owner_id !== user.id) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const { error } = await supabase
    .from('documents')
    .update({ status: 'pending_approval' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể gửi tài liệu' }, { status: 500 })

  await notifyManagers(
    supabase,
    'Tài liệu chờ phê duyệt',
    `"${doc.title}" (${doc.doc_code}) đã được gửi để phê duyệt.`,
    `/documents/${params.id}`
  )

  return NextResponse.json({ success: true })
}
