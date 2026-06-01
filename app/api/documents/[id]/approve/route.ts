import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

// POST /api/documents/[id]/approve
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'qa_manager') return NextResponse.json({ error: 'Chỉ Quản lý QA mới có thể phê duyệt' }, { status: 403 })

  const { data: doc } = await supabase.from('documents').select('*').eq('id', params.id).single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'pending_approval') return NextResponse.json({ error: 'Tài liệu không ở trạng thái chờ phê duyệt' }, { status: 400 })

  const { revision_type, factory_id, department_id } = await request.json()

  const { error } = await supabase
    .from('documents')
    .update({
      status: 'published',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      revision_type: revision_type ?? 'minor',
    })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Không thể phê duyệt tài liệu' }, { status: 500 })

  // Save assignment
  await supabase.from('document_assignments').insert({
    document_id: params.id,
    factory_id: factory_id ?? null,
    department_id: department_id ?? null,
    assigned_by: user.id,
  })

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
