import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canWorkOnDocument } from '@/lib/roles'

const ALLOWED_TYPES = ['image/png', 'image/jpeg']
const MAX_SIZE = 6 * 1024 * 1024

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('flowchart_image_path')
    .eq('id', params.id)
    .single()

  if (!doc?.flowchart_image_path) {
    return NextResponse.json({ error: 'Không tìm thấy ảnh lưu đồ' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('source-documents')
    .createSignedUrl(doc.flowchart_image_path, 60 * 10)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Không thể tạo đường dẫn ảnh' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: doc }, { data: profile }, { data: assignments }] = await Promise.all([
    supabase
      .from('documents')
      .select('status, owner_id, flowchart_image_path')
      .eq('id', params.id)
      .single(),
    supabase.from('users').select('role, department_id').eq('id', user.id).single(),
    supabase.from('document_assignments').select('department_id').eq('document_id', params.id),
  ])

  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'draft') return NextResponse.json({ error: 'Chỉ có thể cập nhật ảnh lưu đồ cho bản nháp' }, { status: 400 })
  if (!canWorkOnDocument({
    role: profile?.role,
    userId: user.id,
    userDepartmentId: profile?.department_id ?? null,
    ownerId: doc.owner_id,
    assignedDepartmentIds: (assignments ?? []).map(item => item.department_id).filter(Boolean),
  })) {
    return NextResponse.json({ error: 'Không có quyền chỉnh sửa tài liệu này' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Vui lòng chọn ảnh lưu đồ' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Chỉ hỗ trợ ảnh PNG hoặc JPG' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Ảnh lưu đồ tối đa 6MB' }, { status: 400 })

  const extension = file.type === 'image/png' ? 'png' : 'jpg'
  const filePath = `documents/${params.id}/flowchart-${Date.now()}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('source-documents')
    .upload(filePath, buffer, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('Flowchart upload error:')
    return NextResponse.json({ error: 'Không thể lưu ảnh lưu đồ' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update({ flowchart_image_path: filePath, flowchart_image_mime: file.type })
    .eq('id', params.id)

  if (updateError) {
    await admin.storage.from('source-documents').remove([filePath])
    return NextResponse.json({ error: 'Không thể cập nhật tài liệu' }, { status: 500 })
  }

  if (doc.flowchart_image_path) {
    await admin.storage.from('source-documents').remove([doc.flowchart_image_path])
  }

  return NextResponse.json({ path: filePath, mime: file.type })
}
