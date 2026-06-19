import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canCreateQualityRecord, canWorkOnDocument } from '@/lib/roles'

// POST /api/documents/[id]/version — create new version from a published document
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, department_id').eq('id', user.id).single()
  if (!canCreateQualityRecord(profile?.role)) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('id, doc_code, title, doc_type, content, mermaid_code, version, status, factory_id, department_id, parent_doc_id, is_addendum, owner_id, source_file_url, flowchart_image_path, flowchart_image_mime')
    .eq('id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })
  if (doc.status !== 'published') return NextResponse.json({ error: 'Chỉ có thể tạo phiên bản mới từ tài liệu đã xuất bản' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const revisionType = body.revision_type === 'major' ? 'major' : 'minor'
  const revisionSummary = String(body.revision_summary ?? '').trim()

  if (!revisionSummary) {
    return NextResponse.json({ error: 'Vui lòng nhập nội dung thay đổi của phiên bản mới' }, { status: 400 })
  }

  const [{ data: assignments }, { data: learningAssets }, { data: resourceLinks }] = await Promise.all([
    supabase
      .from('document_assignments')
      .select('factory_id, department_id')
      .eq('document_id', params.id),
    supabase
      .from('document_learning_assets')
      .select('summary_card, quiz, worker_verification, manager_confirmation, cross_audit_frequency, audit_checklist')
      .eq('document_id', params.id)
      .maybeSingle(),
    supabase
      .from('document_resource_links')
      .select('resource_id')
      .eq('document_id', params.id),
  ])

  if (!canWorkOnDocument({
    role: profile?.role,
    userId: user.id,
    userDepartmentId: profile?.department_id ?? null,
    ownerId: doc.owner_id,
    assignedDepartmentIds: (assignments ?? []).map(item => item.department_id).filter(Boolean),
  })) {
    return NextResponse.json({ error: 'Không có quyền tạo phiên bản mới cho tài liệu này' }, { status: 403 })
  }

  // Keep the approved version published until this draft is approved.
  const { data: newDoc, error } = await supabase
    .from('documents')
    .insert({
      doc_code: doc.doc_code,
      title: doc.title,
      doc_type: doc.doc_type,
      content: doc.content,
      mermaid_code: doc.mermaid_code,
      version: doc.version + 1,
      status: 'draft',
      factory_id: doc.factory_id,
      department_id: doc.department_id,
      parent_doc_id: doc.parent_doc_id,
      is_addendum: doc.is_addendum,
      owner_id: user.id,
      source_file_url: doc.source_file_url,
      flowchart_image_path: doc.flowchart_image_path,
      flowchart_image_mime: doc.flowchart_image_mime,
      revision_type: revisionType,
      revision_summary: revisionSummary,
      previous_version_id: doc.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Create new document version error:')
    return NextResponse.json({ error: 'Không thể tạo phiên bản mới' }, { status: 500 })
  }

  if (assignments?.length) {
    const { error: assignmentError } = await supabase.from('document_assignments').insert(
      assignments.map(assignment => ({
        document_id: newDoc.id,
        factory_id: assignment.factory_id,
        department_id: assignment.department_id,
        assigned_by: user.id,
      }))
    )
    if (assignmentError) console.error('Copy document assignments error:')
  }

  if (learningAssets) {
    const { error: assetError } = await supabase.from('document_learning_assets').insert({
      document_id: newDoc.id,
      summary_card: learningAssets.summary_card,
      quiz: learningAssets.quiz,
      worker_verification: learningAssets.worker_verification,
      manager_confirmation: learningAssets.manager_confirmation,
      cross_audit_frequency: learningAssets.cross_audit_frequency,
      audit_checklist: learningAssets.audit_checklist,
      generated_by: user.id,
    })
    if (assetError) console.error('Copy document learning assets error:')
  }

  if (resourceLinks?.length) {
    const { error: resourceError } = await supabase.from('document_resource_links').insert(
      resourceLinks.map(link => ({
        document_id: newDoc.id,
        resource_id: link.resource_id,
        linked_by: user.id,
      }))
    )
    if (resourceError) console.error('Copy linked document resources error:')
  }

  return NextResponse.json({ document: newDoc }, { status: 201 })
}
