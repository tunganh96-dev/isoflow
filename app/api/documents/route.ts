import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canCreateQualityRecord } from '@/lib/roles'
import { normalizeDocumentMarkdown } from '@/lib/markdown'
import { frequenciesForImportance, normalizeImportanceLevel } from '@/lib/process-importance'

// POST /api/documents — create new document (saves as draft)
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !canCreateQualityRecord(profile.role)) {
    return NextResponse.json({ error: 'Không có quyền tạo tài liệu' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const {
    title,
    doc_code: requestedDocCode,
    doc_type,
    process_importance_level,
    content,
    mermaid_code,
    factory_id,
    department_id,
    department_ids,
    is_addendum,
    parent_doc_id,
    source_file_url,
    resource_ids,
  } = body
  const doc_code = String(requestedDocCode ?? '').trim().toUpperCase()
  const mainDepartmentId = typeof department_id === 'string' && department_id ? department_id : null
  const processImportanceLevel = normalizeImportanceLevel(process_importance_level)
  const defaultFrequencies = frequenciesForImportance(processImportanceLevel)

  if (!title || !doc_type || !doc_code || !mainDepartmentId) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  if (!/^[A-Z0-9._/-]+$/.test(doc_code)) {
    return NextResponse.json({
      error: 'Mã tài liệu chỉ được chứa chữ in hoa, số, dấu chấm, gạch ngang, gạch dưới hoặc dấu /',
    }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('doc_code', doc_code)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `Mã tài liệu ${doc_code} đã tồn tại` }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      doc_code,
      title,
      doc_type,
      process_importance_level: processImportanceLevel,
      content: normalizeDocumentMarkdown(content ?? ''),
      mermaid_code: mermaid_code ?? null,
      factory_id: factory_id ?? null,
      department_id: mainDepartmentId,
      is_addendum: is_addendum ?? false,
      parent_doc_id: parent_doc_id ?? null,
      owner_id: user.id,
      source_file_url: source_file_url ?? null,
      status: 'draft',
      version: 1,
    })
    .select()
    .single()

  if (error) {
    console.error('Create document error:')
    if (error.code === '23505') {
      return NextResponse.json({ error: `Mã tài liệu ${doc_code} đã tồn tại` }, { status: 409 })
    }
    return NextResponse.json({ error: 'Không thể tạo tài liệu' }, { status: 500 })
  }

  const departmentIds = Array.isArray(department_ids)
    ? Array.from(new Set(department_ids.filter((id): id is string => typeof id === 'string' && Boolean(id))))
    : []

  if (departmentIds.length) {
    await supabase.from('document_assignments').insert(
      departmentIds.map(departmentId => ({
        document_id: data.id,
        factory_id: factory_id ?? null,
        department_id: departmentId,
        assigned_by: user.id,
      }))
    )
  }

  const resourceIds = Array.isArray(resource_ids)
    ? Array.from(new Set(resource_ids.filter((id): id is string => typeof id === 'string' && Boolean(id))))
    : []
  if (resourceIds.length) {
    const { error: linkError } = await supabase.from('document_resource_links').insert(
      resourceIds.map(resourceId => ({
        document_id: data.id,
        resource_id: resourceId,
        linked_by: user.id,
      }))
    )
    if (linkError) console.error('Link document resources error:')
  }

  const { error: assetError } = await supabase.from('document_learning_assets').upsert({
    document_id: data.id,
    summary_card: {},
    quiz: [],
    worker_verification: { frequency: defaultFrequencies.worker, items: [] },
    manager_confirmation: { frequency: defaultFrequencies.manager, items: [] },
    cross_audit_frequency: defaultFrequencies.crossAudit,
    audit_checklist: [],
    generated_by: user.id,
  }, { onConflict: 'document_id' })
  if (assetError) console.error('Create document learning controls error:')

  return NextResponse.json({ document: data }, { status: 201 })
}
