import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canCreateQualityRecord } from '@/lib/roles'

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'md', 'jpg', 'jpeg', 'png']
const RESOURCE_TYPES = ['form', 'record', 'reference', 'other']

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('document_resources')
    .select('id, resource_code, name, description, resource_type, department_id, department:department_id(id, name), retention_period, file_name, mime_type, file_size, created_at, updated_at, uploader:uploaded_by(full_name)')
    .order('resource_code')

  if (error) return NextResponse.json({ error: 'Không thể tải thư viện tài liệu' }, { status: 500 })
  return NextResponse.json({ resources: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canCreateQualityRecord(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền tải tài liệu lên' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const resourceCode = String(formData.get('resource_code') ?? '').trim().toUpperCase()
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const departmentId = String(formData.get('department_id') ?? '').trim()
  const retentionPeriod = String(formData.get('retention_period') ?? '').trim()
  const requestedType = String(formData.get('resource_type') ?? 'form')
  const resourceType = RESOURCE_TYPES.includes(requestedType) ? requestedType : 'other'

  if (!file || !resourceCode || !name || !description || !departmentId || !retentionPeriod) {
    return NextResponse.json({ error: 'Vui lòng nhập mã, tên, loại, bộ phận, thời gian lưu, thông tin và chọn file' }, { status: 400 })
  }
  if (!/^[A-Z0-9._/-]+$/.test(resourceCode)) {
    return NextResponse.json({ error: 'Mã tài liệu không đúng định dạng' }, { status: 400 })
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json({ error: 'Định dạng file chưa được hỗ trợ' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('document_resources')
    .select('id')
    .eq('resource_code', resourceCode)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `Mã tài liệu ${resourceCode} đã tồn tại` }, { status: 409 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `library/${resourceCode}/${Date.now()}-${safeName}`
  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage
    .from('source-documents')
    .upload(filePath, buffer, { contentType: file.type || undefined, upsert: false })

  if (uploadError) {
    console.error('Resource upload error:')
    return NextResponse.json({ error: 'Không thể lưu file' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('document_resources')
    .insert({
      resource_code: resourceCode,
      name,
      description,
      resource_type: resourceType,
      department_id: departmentId,
      retention_period: retentionPeriod,
      file_path: filePath,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select('id, resource_code, name, description, resource_type, department_id, department:department_id(id, name), retention_period, file_name, mime_type, file_size, created_at, updated_at')
    .single()

  if (error) {
    await admin.storage.from('source-documents').remove([filePath])
    return NextResponse.json({ error: 'Không thể lưu thông tin tài liệu' }, { status: 500 })
  }

  return NextResponse.json({ resource: data }, { status: 201 })
}
