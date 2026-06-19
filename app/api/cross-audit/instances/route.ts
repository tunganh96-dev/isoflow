import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { normalizeLearningAssets } from '@/lib/learning-assets'
import type { Database } from '@/types/supabase'

interface AuditQuestion {
  id?: string
  document_id: string
  item: string
}

interface AuditAnswer {
  answer?: 'pass' | 'fail'
  comment?: string
}

type AuditInstanceUpdate = Database['public']['Tables']['cross_audit_instances']['Update']

/** GET — get the current user's cross audit instance for a month, or a specific instance */
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const url = new URL(request.url)
  const instanceId = url.searchParams.get('id')

  // Fetch specific instance (for ISO reviewing)
  if (instanceId) {
    const { data: profile } = await admin
      .from('users')
      .select('role, factory_id')
      .eq('id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })

    const { data } = await admin
      .from('cross_audit_instances')
      .select(`
        *,
        target_department:target_department_id(id, name, code),
        auditor:auditor_id(id, full_name)
      `)
      .eq('id', instanceId)
      .single()
    if (!data) return NextResponse.json({ error: 'Không tìm thấy phiên kiểm tra' }, { status: 404 })
    const canRead = data.auditor_id === user.id
      || profile.role === 'super_admin'
      || profile.role === 'coo'
      || (profile.role === 'factory_admin' && profile.factory_id === data.factory_id)
    if (!canRead) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
    return NextResponse.json({ instance: data })
  }

  // Fetch user's instance for a month
  const month = url.searchParams.get('month')
  const factoryId = url.searchParams.get('factory_id')
  if (!month || !factoryId) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  const { data: profile } = await admin
    .from('users')
    .select('id, role, department_id, factory_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  if (profile.role !== 'super_admin' && profile.role !== 'coo' && profile.factory_id !== factoryId) {
    return NextResponse.json({ error: 'Không có quyền truy cập nhà máy này' }, { status: 403 })
  }
  if (!profile.department_id) return NextResponse.json({ instance: null, cycle: null })

  // Find the cycle where user's department is the auditor
  const { data: cycle } = await admin
    .from('cross_audit_cycles')
    .select(`
      id, month, status,
      auditor_department:auditor_department_id(id, name, code),
      target_department:target_department_id(id, name, code)
    `)
    .eq('factory_id', factoryId)
    .eq('month', month)
    .eq('auditor_department_id', profile.department_id)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (!cycle) {
    return NextResponse.json({ instance: null, cycle: null })
  }

  // Find or create instance
  const { data: existing } = await admin
    .from('cross_audit_instances')
    .select('id, cycle_id, auditor_id, factory_id, target_department_id, month, questions, responses, status, submitted_at, reviewed_by, reviewed_at, created_at, updated_at')
    .eq('cycle_id', cycle.id)
    .eq('auditor_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ instance: existing, cycle })
  }

  // Build questions from cross_audit_process_scope for the target department
  const targetDepartment = Array.isArray(cycle.target_department)
    ? cycle.target_department[0]
    : cycle.target_department
  if (!targetDepartment?.id) {
    return NextResponse.json({ error: 'Không tìm thấy bộ phận được kiểm tra' }, { status: 404 })
  }
  const targetDeptId = targetDepartment.id
  const { data: scope } = await admin
    .from('cross_audit_process_scope')
    .select('document_id')
    .eq('factory_id', factoryId)
    .eq('department_id', targetDeptId)

  const docIds = (scope ?? []).map(r => r.document_id)
  if (!docIds.length) {
    return NextResponse.json({
      instance: null,
      cycle,
      error: 'Bộ phận được kiểm tra chưa có quy trình nào trong phạm vi kiểm tra chéo.',
    })
  }

  const { data: docs } = await admin
    .from('documents')
    .select(`
      id, doc_code, title,
      learning:document_learning_assets(audit_checklist)
    `)
    .in('id', docIds)

  const questions = (docs ?? []).flatMap(doc => {
    const learning = Array.isArray(doc.learning) ? doc.learning[0] : doc.learning
    const assets = normalizeLearningAssets(learning)
    return assets.audit_checklist.map((item, index) => ({
      id: `${doc.id}:audit:${index}`,
      document_id: doc.id,
      doc_code: doc.doc_code,
      process_title: doc.title,
      item: item.item,
      check_method: item.check_method,
      pass_criteria: item.pass_criteria,
      fail_criteria: item.fail_criteria,
    }))
  })

  const { data: instance, error } = await admin
    .from('cross_audit_instances')
    .insert({
      cycle_id: cycle.id,
      auditor_id: user.id,
      factory_id: factoryId,
      target_department_id: targetDeptId,
      month,
      questions,
      responses: {},
      status: 'not_started',
    })
    .select('id, cycle_id, auditor_id, factory_id, target_department_id, month, questions, responses, status, submitted_at, reviewed_by, reviewed_at, created_at, updated_at')
    .single()

  if (error) {
    console.error('Create cross audit instance error:')
    return NextResponse.json({ error: 'Không thể tạo phiên kiểm tra' }, { status: 500 })
  }

  return NextResponse.json({ instance, cycle })
}

/** PATCH — save responses or submit */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { instance_id, responses, submit } = body
  if (!instance_id) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  const admin = createAdminClient()

  const { data: instance } = await admin
    .from('cross_audit_instances')
    .select('id, auditor_id, status, questions')
    .eq('id', instance_id)
    .single()

  if (!instance) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })
  if (instance.auditor_id !== user.id) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  if (instance.status === 'submitted' || instance.status === 'reviewed') {
    return NextResponse.json({ error: 'Đã nộp, không thể chỉnh sửa' }, { status: 400 })
  }

  const update: AuditInstanceUpdate = {}
  if (responses && typeof responses === 'object') {
    update.responses = responses
    update.status = 'in_progress'
  }

  if (submit) {
    // Validate all questions answered
    const questions = (Array.isArray(instance.questions) ? instance.questions : []) as AuditQuestion[]
    const resp = responses && typeof responses === 'object'
      ? responses as Record<string, AuditAnswer>
      : {}
    const unanswered = questions.filter((q, i) => {
      const key = q.id ?? `${q.document_id}:audit:${i}`
      return !resp[key]?.answer
    })
    if (unanswered.length > 0) {
      return NextResponse.json({ error: `Còn ${unanswered.length} câu hỏi chưa trả lời` }, { status: 400 })
    }

    // Check fail answers have comments
    const missingComments = questions.filter((q, i) => {
      const key = q.id ?? `${q.document_id}:audit:${i}`
      return resp[key]?.answer === 'fail' && !String(resp[key]?.comment ?? '').trim()
    })
    if (missingComments.length > 0) {
      return NextResponse.json({ error: 'Vui lòng ghi lý do cho mục Không đạt' }, { status: 400 })
    }

    update.status = 'submitted'
    update.submitted_at = new Date().toISOString()

    // Auto-create findings for failed items
    const findings = questions
      .map((q, i) => {
        const key = q.id ?? `${q.document_id}:audit:${i}`
        const r = resp[key]
        if (r?.answer !== 'fail') return null
        return {
          instance_id,
          document_id: q.document_id,
          question_index: i,
          item: q.item,
          comment: r.comment ?? '',
          severity: 'minor',
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)

    if (findings.length > 0) {
      await admin.from('cross_audit_findings').insert(findings)
    }
  }

  const { data, error } = await admin
    .from('cross_audit_instances')
    .update(update)
    .eq('id', instance_id)
    .select('id, cycle_id, auditor_id, factory_id, target_department_id, month, questions, responses, status, submitted_at, reviewed_by, reviewed_at, created_at, updated_at')
    .single()

  if (error) {
    console.error('Update cross audit instance error:')
    return NextResponse.json({ error: 'Không thể lưu' }, { status: 500 })
  }

  return NextResponse.json({ instance: data })
}
