import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { canManageSettings } from '@/lib/roles'
import { normalizeLearningAssets } from '@/lib/learning-assets'
import { normalizeImportanceLevel } from '@/lib/process-importance'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const month = typeof body.month === 'string' && /^\d{4}-\d{2}$/.test(body.month)
    ? body.month
    : new Date().toISOString().slice(0, 7)
  const rebuild = body.rebuild === true

  // Use admin client for data queries (bypasses RLS — already gated by canManageSettings above)
  const admin = createAdminClient()

  const { data: existingPlan } = await admin
    .from('job_monthly_checklist_plans')
    .select('id, month, status, plan, generated_at')
    .eq('job_position_id', params.id)
    .eq('month', month)
    .maybeSingle()

  if (existingPlan && !rebuild) {
    return NextResponse.json({ plan_id: existingPlan.id, month: existingPlan.month, status: existingPlan.status, plan: existingPlan.plan, generated_at: existingPlan.generated_at, existing: true })
  }

  const [{ data: links }, { data: job }] = await Promise.all([
    admin
      .from('job_position_processes')
      .select('document_id')
      .eq('job_position_id', params.id),
    admin
      .from('job_positions')
      .select('role_type')
      .eq('id', params.id)
      .single(),
  ])

  const docIds = (links ?? []).map((link: any) => link.document_id).filter(Boolean)

  const { data: processes } = docIds.length
    ? await admin
      .from('documents')
      .select(`
        id, doc_code, title, process_importance_level,
        learning:document_learning_assets (
          summary_card, quiz, worker_verification, manager_confirmation, cross_audit_frequency, audit_checklist
        )
      `)
      .in('id', docIds)
    : { data: [] as any[] }

  const checklistMode = checklistModeForRole(job?.role_type)
  const plan = buildMonthlyPlan(month, processes ?? [], checklistMode)

  // Check if any questions were generated
  const totalQuestions = plan[0]?.questions?.length ?? 0
  if (totalQuestions === 0) {
    return NextResponse.json({
      error: 'Không có câu hỏi checklist. Các quy trình chưa có nội dung kiểm tra. Vui lòng mở từng tài liệu và tạo Learning Assets trước.',
    }, { status: 400 })
  }

  const generatedAt = new Date().toISOString()
  const query = existingPlan
    ? admin
      .from('job_monthly_checklist_plans')
      .update({ plan, generated_at: generatedAt })
      .eq('id', existingPlan.id)
    : admin
      .from('job_monthly_checklist_plans')
      .insert({
        job_position_id: params.id,
        month,
        plan,
        status: 'draft',
        generated_at: generatedAt,
      })

  const { data, error } = await query.select('id, month, status, plan, generated_at').single()

  if (error) {
    console.error('Generate monthly plan error:')
    return NextResponse.json({ error: 'Không thể tạo kế hoạch tháng' }, { status: 500 })
  }

  return NextResponse.json({
    plan_id: data.id,
    month: data.month,
    status: data.status,
    plan: data.plan,
    generated_at: data.generated_at,
    rebuilt: Boolean(existingPlan),
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!canManageSettings(profile?.role)) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const month = typeof body.month === 'string' && /^\d{4}-\d{2}$/.test(body.month) ? body.month : ''
  const plan = Array.isArray(body.plan) ? body.plan : null

  if (!month || !plan) {
    return NextResponse.json({ error: 'Thiếu tháng hoặc nội dung lịch' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('job_monthly_checklist_plans')
    .update({ plan })
    .eq('job_position_id', params.id)
    .eq('month', month)
    .select('id, month, status, plan, generated_at')
    .single()

  if (error) {
    console.error('Update monthly plan error:')
    return NextResponse.json({ error: 'Không thể lưu chỉnh sửa lịch' }, { status: 500 })
  }

  return NextResponse.json({ plan: data })
}

function buildMonthlyPlan(month: string, processes: any[], checklistMode: ChecklistMode) {
  const [year, monthNumber] = month.split('-').map(Number)
  const days = new Date(year, monthNumber, 0).getDate()
  const pool: any[] = processes.flatMap(process => {
    const assets = normalizeLearningAssets(Array.isArray(process.learning) ? process.learning[0] : process.learning)
    const level = normalizeImportanceLevel(process.process_importance_level)
    const checklist = checklistMode === 'manager_confirmation'
      ? assets.manager_confirmation
      : assets.worker_verification
    return checklist.items.map((item, index) => ({
      id: `${process.id}:${index}`,
      process_id: process.id,
      doc_code: process.doc_code,
      process_title: process.title,
      importance_level: level,
      frequency: checklist.frequency,
      item: item.item,
      instruction: item.instruction,
      checklist_type: checklistMode,
      weight: level,
    }))
  })

  return Array.from({ length: days }, (_, dayIndex) => {
    const date = `${month}-${String(dayIndex + 1).padStart(2, '0')}`
    const questions = [...pool].sort(sortQuestion)

    return {
      date,
      checklist_type: checklistMode,
      questions,
    }
  })
}

type ChecklistMode = 'sop_verification' | 'manager_confirmation'

function checklistModeForRole(roleType: unknown): ChecklistMode {
  return roleType === 'manager' || roleType === 'supervisor'
    ? 'manager_confirmation'
    : 'sop_verification'
}

function sortQuestion(a: any, b: any) {
  return b.weight - a.weight || a.doc_code.localeCompare(b.doc_code) || a.item.localeCompare(b.item)
}
