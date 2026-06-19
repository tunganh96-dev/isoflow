import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

/** GET — list scoped processes for a department */
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, factory_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (!canManageSettings(profile.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const url = new URL(request.url)
  const factoryId = url.searchParams.get('factory_id')
  const departmentId = url.searchParams.get('department_id')
  if (factoryId && !['super_admin', 'coo'].includes(profile.role) && profile.factory_id !== factoryId) {
    return NextResponse.json({ error: 'Không có quyền truy cập nhà máy này' }, { status: 403 })
  }
  if (departmentId) {
    const { data: department } = await supabase.from('departments').select('factory_id').eq('id', departmentId).single()
    if (!department) return NextResponse.json({ error: 'Bộ phận không tồn tại' }, { status: 404 })
    if (!['super_admin', 'coo'].includes(profile.role) && profile.factory_id !== department.factory_id) {
      return NextResponse.json({ error: 'Không có quyền truy cập bộ phận này' }, { status: 403 })
    }
  }

  const admin = createAdminClient()

  if (departmentId) {
    const { data } = await admin
      .from('cross_audit_process_scope')
      .select('id, document_id, document:document_id(doc_code, title)')
      .eq('department_id', departmentId)
    return NextResponse.json({ scope: data ?? [] })
  }

  // Return all departments with their scoped process counts
  let query = admin
    .from('departments')
    .select('id, name, code, factory_id, factory:factory_id(name, code)')
    .order('name')
  if (factoryId) query = query.eq('factory_id', factoryId)
  const { data: departments } = await query

  const { data: allScope } = await admin
    .from('cross_audit_process_scope')
    .select('department_id, document_id')

  const countMap = new Map<string, number>()
  ;(allScope ?? []).forEach(row => {
    countMap.set(row.department_id, (countMap.get(row.department_id) ?? 0) + 1)
  })

  const result = (departments ?? []).map(dept => ({
    ...dept,
    process_count: countMap.get(dept.id) ?? 0,
  }))

  return NextResponse.json({ departments: result })
}

/** POST — set scoped processes for a department (replaces all) */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, factory_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (!canManageSettings(profile.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { factory_id, department_id, document_ids } = body

  if (!factory_id || !department_id || !Array.isArray(document_ids)) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  }
  if (!['super_admin', 'coo'].includes(profile.role) && profile.factory_id !== factory_id) {
    return NextResponse.json({ error: 'Không có quyền truy cập nhà máy này' }, { status: 403 })
  }
  const { data: department } = await supabase.from('departments').select('factory_id').eq('id', department_id).single()
  if (!department || department.factory_id !== factory_id) {
    return NextResponse.json({ error: 'Bộ phận không thuộc nhà máy đã chọn' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Delete existing scope for this department
  await admin
    .from('cross_audit_process_scope')
    .delete()
    .eq('factory_id', factory_id)
    .eq('department_id', department_id)

  // Insert new scope
  if (document_ids.length > 0) {
    const rows = document_ids.map((docId: string) => ({
      factory_id,
      department_id,
      document_id: docId,
      added_by: user.id,
    }))
    const { error } = await admin.from('cross_audit_process_scope').insert(rows)
    if (error) {
      console.error('Save cross audit scope error:')
      return NextResponse.json({ error: 'Không thể lưu phạm vi kiểm tra' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, count: document_ids.length })
}
