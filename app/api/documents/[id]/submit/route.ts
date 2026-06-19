import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyManagers } from '@/lib/notifications'
import { canWorkOnDocument } from '@/lib/roles'

// POST /api/documents/[id]/submit — submit draft for approval
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, doc_code, status, owner_id, factory_id')
    .eq('id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'draft') return NextResponse.json({ error: 'Chỉ có thể gửi tài liệu ở trạng thái bản nháp' }, { status: 400 })
  const [{ data: profile }, { data: assignments }] = await Promise.all([
    supabase.from('users').select('role, department_id').eq('id', user.id).single(),
    supabase.from('document_assignments').select('department_id').eq('document_id', params.id),
  ])
  if (!canWorkOnDocument({
    role: profile?.role,
    userId: user.id,
    userDepartmentId: profile?.department_id ?? null,
    ownerId: doc.owner_id,
    assignedDepartmentIds: (assignments ?? []).map(item => item.department_id).filter(Boolean),
  })) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { error } = await supabase
    .from('documents')
    .update({ status: 'pending_approval' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể gửi tài liệu' }, { status: 500 })

  await notifyManagers(
    supabase,
    'Tài liệu chờ phê duyệt',
    `"${doc.title}" (${doc.doc_code}) đã được gửi để phê duyệt.`,
    `/documents/${params.id}`,
    doc.factory_id
  )

  return NextResponse.json({ success: true })
}
