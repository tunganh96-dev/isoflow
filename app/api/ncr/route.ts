import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateNcrCode } from '@/lib/ncr'
import { canCreateQualityRecord } from '@/lib/roles'
import { notifyManagers } from '@/lib/notifications'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role, factory_id')
    .eq('id', user.id)
    .single()
  if (!profile || !canCreateQualityRecord(profile.role)) {
    return NextResponse.json({ error: 'Không có quyền tạo NCR' }, { status: 403 })
  }

  const { description, department_id, iso_clause, severity, reporter_name, photo_urls } = await request.json().catch(() => ({}))

  if (!description || !department_id || !severity) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  if (!profile.factory_id) {
    return NextResponse.json({ error: 'Người dùng chưa được gán nhà máy' }, { status: 400 })
  }

  const { data: department } = await supabase
    .from('departments')
    .select('id, factory_id')
    .eq('id', department_id)
    .single()
  if (!department) return NextResponse.json({ error: 'Bộ phận không tồn tại' }, { status: 400 })
  if (department.factory_id !== profile.factory_id) {
    return NextResponse.json({ error: 'Bộ phận không thuộc nhà máy của bạn' }, { status: 403 })
  }

  // Photo required for major + critical
  const photoUrls = Array.isArray(photo_urls) ? photo_urls : []
  if (['major', 'critical'].includes(severity) && photoUrls.length === 0) {
    return NextResponse.json({ error: 'NCR mức độ lớn/nghiêm trọng phải có ảnh bằng chứng' }, { status: 400 })
  }
  const expectedPhotoPrefix = `${profile.factory_id}/${user.id}/photos/`
  if (photoUrls.some(path => typeof path !== 'string' || !path.startsWith(expectedPhotoPrefix))) {
    return NextResponse.json({ error: 'Đường dẫn ảnh NCR không hợp lệ' }, { status: 400 })
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
      photo_urls: photoUrls,
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    console.error('Create NCR error:')
    return NextResponse.json({ error: 'Không thể tạo NCR' }, { status: 500 })
  }

  // Log activity
  await supabase.from('ncr_activity').insert({
    ncr_id: data.id,
    user_id: user.id,
    action: 'created',
    notes: `NCR ${ncr_code} được tạo với mức độ ${severity}`,
  })

  await notifyManagers(
    supabase,
    'NCR mới cần xem xét',
    `${ncr_code}: ${description}`,
    `/ncr/${data.id}`,
    profile.factory_id
  )

  return NextResponse.json({ ncr: data }, { status: 201 })
}
