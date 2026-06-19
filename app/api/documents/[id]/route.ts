import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canWorkOnDocument } from '@/lib/roles'
import { normalizeDocumentMarkdown } from '@/lib/markdown'
import { normalizeLearningAssets } from '@/lib/learning-assets'
import { normalizeImportanceLevel } from '@/lib/process-importance'

// GET /api/documents/[id]
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: document } = await supabase
    .from('documents')
    .select('id, doc_code, title, doc_type, content, mermaid_code, version, status, factory_id, department_id, parent_doc_id, is_addendum, owner_id, approved_by, approved_at, revision_type, revision_summary, previous_version_id, review_date, source_file_url, flowchart_image_path, flowchart_image_mime, process_importance, process_importance_level, created_at, updated_at')
    .eq('id', params.id)
    .single()
  if (!document) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })

  const [{ data: profile }, { data: assignments }, { data: assetRow }] = await Promise.all([
    supabase.from('users').select('role, department_id').eq('id', user.id).single(),
    supabase.from('document_assignments').select('department_id').eq('document_id', params.id),
    supabase
      .from('document_learning_assets')
      .select('summary_card, quiz, worker_verification, manager_confirmation, cross_audit_frequency, audit_checklist')
      .eq('document_id', params.id)
      .maybeSingle(),
  ])

  if (document.status !== 'published' && !canWorkOnDocument({
    role: profile?.role,
    userId: user.id,
    userDepartmentId: profile?.department_id ?? null,
    ownerId: document.owner_id,
    assignedDepartmentIds: (assignments ?? []).map(item => item.department_id).filter(Boolean),
  })) {
    return NextResponse.json({ error: 'Không có quyền xem phiên bản này' }, { status: 403 })
  }

  return NextResponse.json({
    document,
    learning_assets: assetRow ? normalizeLearningAssets(assetRow) : null,
  })
}

// PATCH /api/documents/[id] — update draft content
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('id, doc_code, version, status, owner_id')
    .eq('id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })

  if (doc.status !== 'draft') {
    return NextResponse.json({ error: 'Chỉ có thể chỉnh sửa tài liệu ở trạng thái bản nháp' }, { status: 400 })
  }

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
    return NextResponse.json({ error: 'Không có quyền chỉnh sửa tài liệu này' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { title, doc_code: requestedDocCode, content, mermaid_code, learning_assets, resource_ids, department_id, process_importance_level, department_ids } = body
  const docCode = String(requestedDocCode ?? doc.doc_code).trim().toUpperCase()
  const mainDepartmentId = typeof department_id === 'string' && department_id ? department_id : null
  const processImportanceLevel = normalizeImportanceLevel(process_importance_level)

  if (!title?.trim() || !docCode || !mainDepartmentId || !/^[A-Z0-9._/-]+$/.test(docCode)) {
    return NextResponse.json({ error: 'Mã hoặc tên tài liệu không đúng định dạng' }, { status: 400 })
  }

  const { data: duplicate } = await supabase
    .from('documents')
    .select('id')
    .eq('doc_code', docCode)
    .eq('version', doc.version)
    .neq('id', params.id)
    .maybeSingle()
  if (duplicate) return NextResponse.json({ error: `Mã tài liệu ${docCode} đã tồn tại` }, { status: 409 })

  const { data, error } = await supabase
    .from('documents')
    .update({ title: title.trim(), doc_code: docCode, department_id: mainDepartmentId, process_importance_level: processImportanceLevel, content: normalizeDocumentMarkdown(content ?? ''), mermaid_code })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Không thể cập nhật tài liệu' }, { status: 500 })

  if (Array.isArray(department_ids)) {
    const departmentIds = Array.from(new Set(department_ids.filter((id): id is string => typeof id === 'string' && Boolean(id))))
    const { error: deleteAssignmentError } = await supabase.from('document_assignments').delete().eq('document_id', params.id)
    if (deleteAssignmentError) return NextResponse.json({ error: 'Không thể cập nhật bộ phận bắt buộc học' }, { status: 500 })

    if (departmentIds.length) {
      const { error: assignmentError } = await supabase.from('document_assignments').insert(
        departmentIds.map(departmentId => ({
          document_id: params.id,
          department_id: departmentId,
          assigned_by: user.id,
        }))
      )
      if (assignmentError) return NextResponse.json({ error: 'Không thể cập nhật bộ phận bắt buộc học' }, { status: 500 })
    }
  }

  if (Array.isArray(resource_ids)) {
    const resourceIds = Array.from(new Set(resource_ids.filter((id): id is string => typeof id === 'string' && Boolean(id))))
    const { error: deleteError } = await supabase.from('document_resource_links').delete().eq('document_id', params.id)
    if (deleteError) return NextResponse.json({ error: 'Không thể cập nhật tài liệu liên quan' }, { status: 500 })

    if (resourceIds.length) {
      const { error: linkError } = await supabase.from('document_resource_links').insert(
        resourceIds.map(resourceId => ({ document_id: params.id, resource_id: resourceId, linked_by: user.id }))
      )
      if (linkError) return NextResponse.json({ error: 'Không thể cập nhật tài liệu liên quan' }, { status: 500 })
    }
  }

  if (learning_assets) {
    const assets = normalizeLearningAssets(learning_assets)
    const { error: assetError } = await supabase
      .from('document_learning_assets')
      .upsert({
        document_id: params.id,
        summary_card: assets.summary_card,
        quiz: assets.quiz,
        worker_verification: assets.worker_verification,
        manager_confirmation: assets.manager_confirmation,
        cross_audit_frequency: assets.cross_audit_frequency,
        audit_checklist: assets.audit_checklist,
        generated_by: user.id,
      }, { onConflict: 'document_id' })

    if (assetError) {
      console.error('Save learning assets error:')
      return NextResponse.json({ error: 'Đã lưu tài liệu nhưng không thể lưu nội dung đào tạo' }, { status: 500 })
    }
  }

  return NextResponse.json({ document: data })
}

// DELETE /api/documents/[id] — delete draft/update draft only
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: doc }, { data: profile }, { data: assignments }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, status, owner_id, source_file_url, flowchart_image_path')
      .eq('id', params.id)
      .single(),
    supabase.from('users').select('role, department_id').eq('id', user.id).single(),
    supabase.from('document_assignments').select('department_id').eq('document_id', params.id),
  ])

  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'draft') {
    return NextResponse.json({ error: 'Chỉ có thể xóa tài liệu ở trạng thái bản nháp' }, { status: 400 })
  }

  if (!canWorkOnDocument({
    role: profile?.role,
    userId: user.id,
    userDepartmentId: profile?.department_id ?? null,
    ownerId: doc.owner_id,
    assignedDepartmentIds: (assignments ?? []).map(item => item.department_id).filter(Boolean),
  })) {
    return NextResponse.json({ error: 'Không có quyền xóa tài liệu này' }, { status: 403 })
  }

  const filesToRemove = [
    typeof doc.source_file_url === 'string' ? doc.source_file_url : '',
    typeof doc.flowchart_image_path === 'string' ? doc.flowchart_image_path : '',
  ].filter(Boolean)
  const removableFiles: string[] = []

  for (const filePath of filesToRemove) {
    const { data: sourceRefs } = await supabase
      .from('documents')
      .select('id')
      .eq('source_file_url', filePath)
      .neq('id', params.id)
      .limit(1)
    const { data: flowchartRefs } = await supabase
      .from('documents')
      .select('id')
      .eq('flowchart_image_path', filePath)
      .neq('id', params.id)
      .limit(1)

    if (!sourceRefs?.length && !flowchartRefs?.length) removableFiles.push(filePath)
  }

  const { error } = await supabase.from('documents').delete().eq('id', params.id)
  if (error) {
    console.error('Delete draft document error:')
    return NextResponse.json({ error: 'Không thể xóa bản nháp' }, { status: 500 })
  }

  if (removableFiles.length) {
    const admin = createAdminClient()
    await admin.storage.from('source-documents').remove(removableFiles)
  }

  return NextResponse.json({ ok: true })
}
