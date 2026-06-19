import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { canApproveQualityRecord } from '@/lib/roles'

// POST /api/documents/[id]/approve
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canApproveQualityRecord(profile?.role)) return NextResponse.json({ error: 'Không có quyền phê duyệt' }, { status: 403 })

  const { data: doc } = await supabase
    .from('documents')
    .select('status, previous_version_id, revision_type, owner_id, title, doc_code')
    .eq('id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'pending_approval') return NextResponse.json({ error: 'Tài liệu không ở trạng thái chờ phê duyệt' }, { status: 400 })

  if (doc.previous_version_id) {
    const { error: archiveError } = await supabase
      .from('documents')
      .update({ status: 'archived' })
      .eq('id', doc.previous_version_id)
      .eq('status', 'published')

    if (archiveError) {
      return NextResponse.json({ error: 'Không thể lưu trữ phiên bản trước' }, { status: 500 })
    }
  }

  const { error } = await supabase
    .from('documents')
    .update({
      status: 'published',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      revision_type: doc.revision_type,
    })
    .eq('id', params.id)

  if (error) {
    if (doc.previous_version_id) {
      await supabase
        .from('documents')
        .update({ status: 'published' })
        .eq('id', doc.previous_version_id)
    }
    return NextResponse.json({ error: 'Không thể phê duyệt tài liệu' }, { status: 500 })
  }

  // Notify owner
  await createNotification(
    supabase,
    doc.owner_id,
    'Tài liệu đã được phê duyệt',
    `"${doc.title}" (${doc.doc_code}) đã được phê duyệt và xuất bản.`,
    `/documents/${params.id}`
  )

  return NextResponse.json({ success: true })
}
