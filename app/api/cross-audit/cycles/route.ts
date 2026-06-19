import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'

/** GET — get cycles for a month */
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const factoryId = url.searchParams.get('factory_id')
  const month = url.searchParams.get('month')
  if (!factoryId || !month) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  const { data: profile } = await supabase.from('users').select('role, factory_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (!['super_admin', 'coo'].includes(profile.role) && profile.factory_id !== factoryId) {
    return NextResponse.json({ error: 'Không có quyền truy cập nhà máy này' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: cycles } = await admin
    .from('cross_audit_cycles')
    .select(`
      id, month, status, confirmed_at,
      auditor_department:auditor_department_id(id, name, code),
      target_department:target_department_id(id, name, code)
    `)
    .eq('factory_id', factoryId)
    .eq('month', month)
    .order('created_at')

  return NextResponse.json({ cycles: cycles ?? [] })
}

/** POST — generate or confirm cycles */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, factory_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (!canManageSettings(profile.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { factory_id, month, action } = body

  if (!factory_id || !month) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })
  if (!['super_admin', 'coo'].includes(profile.role) && profile.factory_id !== factory_id) {
    return NextResponse.json({ error: 'Không có quyền truy cập nhà máy này' }, { status: 403 })
  }

  const admin = createAdminClient()

  if (action === 'confirm') {
    const { error } = await admin
      .from('cross_audit_cycles')
      .update({ status: 'confirmed', confirmed_by: user.id, confirmed_at: new Date().toISOString() })
      .eq('factory_id', factory_id)
      .eq('month', month)
      .eq('status', 'draft')
    if (error) return NextResponse.json({ error: 'Không thể xác nhận' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Generate random rotation
  const [{ data: departments }, { data: scopeRows }] = await Promise.all([
    admin
      .from('departments')
      .select('id, name, code')
      .eq('factory_id', factory_id)
      .order('name'),
    admin
      .from('cross_audit_process_scope')
      .select('department_id')
      .eq('factory_id', factory_id),
  ])

  // Only departments that have processes configured as audit targets
  const deptWithScope = new Set((scopeRows ?? []).map(r => r.department_id))
  const targetDepts = (departments ?? []).filter(d => deptWithScope.has(d.id))
  // All departments can be auditors
  const auditorDepts = departments ?? []

  if (targetDepts.length < 1 || auditorDepts.length < 2) {
    return NextResponse.json({
      error: targetDepts.length < 1
        ? 'Chưa có bộ phận nào có quy trình trong phạm vi kiểm tra chéo. Vui lòng cấu hình trong Cài đặt → Kiểm tra chéo.'
        : 'Cần ít nhất 2 bộ phận để tạo kiểm tra chéo',
    }, { status: 400 })
  }

  // Check if cycles already exist for this month
  const { data: existing } = await admin
    .from('cross_audit_cycles')
    .select('id, status')
    .eq('factory_id', factory_id)
    .eq('month', month)
    .limit(1)

  if (existing && existing.length > 0) {
    // Only delete draft cycles
    await admin
      .from('cross_audit_cycles')
      .delete()
      .eq('factory_id', factory_id)
      .eq('month', month)
      .eq('status', 'draft')
  }

  // Shuffle target departments, then assign each to a different auditor department
  // Each auditor audits exactly one target, and no department audits itself
  const shuffledTargets = [...targetDepts].sort(() => Math.random() - 0.5)
  const shuffledAuditors = [...auditorDepts].sort(() => Math.random() - 0.5)

  const cycles: { factory_id: string; month: string; auditor_department_id: string; target_department_id: string; status: string }[] = []
  const usedAuditors = new Set<string>()

  for (const target of shuffledTargets) {
    // Find an auditor that isn't this target and hasn't been used yet
    const auditor = shuffledAuditors.find(a => a.id !== target.id && !usedAuditors.has(a.id))
      ?? shuffledAuditors.find(a => a.id !== target.id) // fallback: allow reuse if not enough auditors
    if (!auditor) continue
    usedAuditors.add(auditor.id)
    cycles.push({
      factory_id,
      month,
      auditor_department_id: auditor.id,
      target_department_id: target.id,
      status: 'draft',
    })
  }

  const { data: inserted, error } = await admin
    .from('cross_audit_cycles')
    .insert(cycles)
    .select(`
      id, month, status,
      auditor_department:auditor_department_id(id, name, code),
      target_department:target_department_id(id, name, code)
    `)

  if (error) {
    console.error('Generate cross audit cycles error:')
    return NextResponse.json({ error: 'Không thể tạo lịch kiểm tra chéo' }, { status: 500 })
  }

  return NextResponse.json({ cycles: inserted ?? [] })
}
