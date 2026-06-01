import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/documents/[id]
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: document } = await supabase.from('documents').select('*').eq('id', params.id).single()
  if (!document) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })

  return NextResponse.json({ document })
}

// PATCH /api/documents/[id] — update draft content
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase.from('documents').select('*').eq('id', params.id).single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })

  if (doc.status !== 'draft') {
    return NextResponse.json({ error: 'Chỉ có thể chỉnh sửa tài liệu ở trạng thái bản nháp' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (doc.owner_id !== user.id && profile?.role !== 'qa_manager') {
    return NextResponse.json({ error: 'Không có quyền chỉnh sửa tài liệu này' }, { status: 403 })
  }

  const body = await request.json()
  const { title, content, mermaid_code } = body

  const { data, error } = await supabase
    .from('documents')
    .update({ title, content, mermaid_code })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Không thể cập nhật tài liệu' }, { status: 500 })
  return NextResponse.json({ document: data })
}
