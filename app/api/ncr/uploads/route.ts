import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canCreateQualityRecord } from '@/lib/roles'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const EVIDENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  const uploadType = formData.get('type')
  const ncrId = formData.get('ncr_id')

  if (!(file instanceof File) || (uploadType !== 'photo' && uploadType !== 'evidence')) {
    return NextResponse.json({ error: 'Tệp tải lên không hợp lệ' }, { status: 400 })
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Tệp phải nhỏ hơn 10 MB' }, { status: 400 })
  }
  if (uploadType === 'photo' && !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Ảnh NCR phải là tệp hình ảnh' }, { status: 400 })
  }
  if (uploadType === 'evidence' && !EVIDENCE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Bằng chứng chỉ hỗ trợ JPG, PNG, WebP hoặc PDF' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, factory_id')
    .eq('id', user.id)
    .single()

  if (!profile?.factory_id) {
    return NextResponse.json({ error: 'Người dùng chưa được gán nhà máy' }, { status: 400 })
  }

  if (uploadType === 'photo' && !canCreateQualityRecord(profile.role)) {
    return NextResponse.json({ error: 'Không có quyền tải ảnh NCR' }, { status: 403 })
  }

  if (uploadType === 'evidence') {
    if (typeof ncrId !== 'string' || !ncrId) {
      return NextResponse.json({ error: 'Thiếu NCR cần tải bằng chứng' }, { status: 400 })
    }
    const { data: ncr } = await supabase
      .from('ncrs')
      .select('assigned_to, factory_id, status')
      .eq('id', ncrId)
      .single()
    if (!ncr) return NextResponse.json({ error: 'Không tìm thấy NCR' }, { status: 404 })
    if (ncr.assigned_to !== user.id || ncr.status !== 'implementing') {
      return NextResponse.json({ error: 'Không có quyền tải bằng chứng cho NCR này' }, { status: 403 })
    }
    if (ncr.factory_id !== profile.factory_id) {
      return NextResponse.json({ error: 'NCR không thuộc nhà máy của bạn' }, { status: 403 })
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = uploadType === 'photo' ? 'photos' : `evidence/${String(ncrId)}`
  const path = `${profile.factory_id}/${user.id}/${folder}/${Date.now()}-${randomUUID()}-${safeName}`
  const bucket = uploadType === 'photo' ? 'ncr-photos' : 'ncr-evidence'
  const admin = createAdminClient()
  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    console.error('NCR upload error:')
    return NextResponse.json({ error: 'Không thể tải tệp lên' }, { status: 500 })
  }

  return NextResponse.json({ path }, { status: 201 })
}
