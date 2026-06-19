import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: document } = await supabase
    .from('documents')
    .select('source_file_url')
    .eq('id', params.id)
    .single()

  if (!document?.source_file_url) {
    return NextResponse.json({ error: 'Không tìm thấy file gốc' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('source-documents')
    .createSignedUrl(document.source_file_url, 60 * 10)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Không thể tạo đường dẫn tải file' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
