import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canWorkOnDocument } from '@/lib/roles'
import { buildWordHtml, exportFileName } from '@/lib/document-export'

interface FlowchartDocument {
  flowchart_image_path: string | null
  flowchart_image_mime: string | null
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('doc_code, title, content, version, approved_at, updated_at, status, owner_id, flowchart_image_path, flowchart_image_mime')
    .eq('id', params.id)
    .single()
  if (!doc) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })

  const [{ data: profile }, { data: assignments }] = await Promise.all([
    supabase.from('users').select('role, department_id').eq('id', user.id).single(),
    supabase.from('document_assignments').select('department_id').eq('document_id', params.id),
  ])

  if (doc.status !== 'published' && !canWorkOnDocument({
    role: profile?.role,
    userId: user.id,
    userDepartmentId: profile?.department_id ?? null,
    ownerId: doc.owner_id,
    assignedDepartmentIds: (assignments ?? []).map(item => item.department_id).filter(Boolean),
  })) {
    return NextResponse.json({ error: 'Không có quyền xuất tài liệu này' }, { status: 403 })
  }

  const html = buildWordHtml(doc, { flowchartImage: await loadFlowchartImage(doc) })
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(exportFileName(doc, 'doc'))}`,
    },
  })
}

async function loadFlowchartImage(doc: FlowchartDocument) {
  if (!doc.flowchart_image_path || !doc.flowchart_image_mime) return null
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('source-documents').download(doc.flowchart_image_path)
  if (error || !data) return null
  return {
    buffer: Buffer.from(await data.arrayBuffer()),
    mime: doc.flowchart_image_mime,
  }
}
