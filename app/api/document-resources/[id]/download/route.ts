import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: resource } = await supabase
    .from('document_resources')
    .select('file_path')
    .eq('id', params.id)
    .single()
  if (!resource) return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('source-documents')
    .createSignedUrl(resource.file_path, 60 * 10)
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Không thể tạo đường dẫn tải file' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
