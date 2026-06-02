import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateNcrCode } from '@/lib/ncr'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile || !['qa_employee', 'qa_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Không có quyền tạo NCR' }, { status: 403 })
  }

  const { description, department_id, iso_clause, severity, reporter_name, photo_urls } = await request.json()

  if (!description || !department_id || !severity) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  // Photo required for major + critical
  if (['major', 'critical'].includes(severity) && (!photo_urls || photo_urls.length === 0)) {
    return NextResponse.json({ error: 'NCR mức độ lớn/nghiêm trọng phải có ảnh bằng chứng' }, { status: 400 })
  }

  const { data: factory } = await supabase
    .from('factories')
    .select('code')
    .eq('id', profile.factory_id)
    .single()

  const factoryCode = factory?.code ?? 'HQ'
  const ncr_code = await generateNcrCode(supabase, factoryCode)

  const { data, error } = await supabase
    .from('ncrs')
    .insert({
      ncr_code,
      description,
      department_id,
      iso_clause: iso_clause ?? null,
      severity,
      factory_id: profile.factory_id,
      raised_by: user.id,
      reporter_name: reporter_name ?? null,
      photo_urls: photo_urls ?? [],
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    console.error('Create NCR error:', error)
    return NextResponse.json({ error: 'Không thể tạo NCR' }, { status: 500 })
  }

  // Log activity
  await supabase.from('ncr_activity').insert({
    ncr_id: data.id,
    user_id: user.id,
    action: 'created',
    notes: `NCR ${ncr_code} được tạo với mức độ ${severity}`,
  })

  return NextResponse.json({ ncr: data }, { status: 201 })
}
