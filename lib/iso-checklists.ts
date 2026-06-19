import type { SupabaseClient } from '@supabase/supabase-js'

export type ChecklistAnswer = 'pass' | 'fail'

export interface ChecklistProfile {
  id: string
  factory_id: string | null
  department_id: string | null
  job_position_id: string | null
}

export interface ChecklistQuestion {
  id?: string
  process_id?: string
  [key: string]: unknown
}

export interface ChecklistResponse {
  answer?: ChecklistAnswer
  comment?: string
}

export interface ChecklistInstance {
  questions?: ChecklistQuestion[] | null
  responses?: Record<string, ChecklistResponse> | null
}

interface ChecklistPlanDay {
  date?: string
  checklist_type?: string
  questions?: ChecklistQuestion[]
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function monthFromDate(date: string) {
  return date.slice(0, 7)
}

export function checklistModeForJobRole(roleType: unknown) {
  return roleType === 'manager' || roleType === 'supervisor'
    ? 'manager_confirmation'
    : 'sop_verification'
}

export async function ensureChecklistInstance(admin: SupabaseClient, profile: ChecklistProfile, date: string) {
  const { data: existing } = await admin
    .from('iso_checklist_instances')
    .select('id, user_id, checklist_date, job_position_id, factory_id, department_id, checklist_type, questions, responses, status, late_reason, submitted_at, created_at, updated_at')
    .eq('user_id', profile.id)
    .eq('checklist_date', date)
    .maybeSingle()

  // If instance exists with questions or already submitted, return as-is
  if (existing) {
    const hasQuestions = Array.isArray(existing.questions) && existing.questions.length > 0
    const isSubmitted = existing.status === 'submitted'
    if (hasQuestions || isSubmitted) return existing

    // Instance has 0 questions and not submitted — try to rebuild from current plan
    if (profile.job_position_id) {
      const { data: plan } = await admin
        .from('job_monthly_checklist_plans')
        .select('plan')
        .eq('job_position_id', profile.job_position_id)
        .eq('month', monthFromDate(date))
        .maybeSingle()

      const planDays = (Array.isArray(plan?.plan) ? plan.plan : []) as ChecklistPlanDay[]
      const matchingDay = planDays.find(day => day.date === date)
      const templateDay = matchingDay ?? planDays[0]
      const questions = Array.isArray(templateDay?.questions) ? templateDay.questions : []

      if (questions.length > 0) {
        const { data: updated } = await admin
          .from('iso_checklist_instances')
          .update({ questions, checklist_type: templateDay?.checklist_type ?? existing.checklist_type })
          .eq('id', existing.id)
          .select('id, user_id, checklist_date, job_position_id, factory_id, department_id, checklist_type, questions, responses, status, late_reason, submitted_at, created_at, updated_at')
          .single()
        return updated ?? existing
      }
    }

    return existing
  }
  if (!profile.job_position_id) return null

  const [{ data: job }, { data: exactPlan }] = await Promise.all([
    admin
      .from('job_positions')
      .select('id, role_type')
      .eq('id', profile.job_position_id)
      .maybeSingle(),
    admin
      .from('job_monthly_checklist_plans')
      .select('plan')
      .eq('job_position_id', profile.job_position_id)
      .eq('month', monthFromDate(date))
      .maybeSingle(),
  ])

  let plan = exactPlan
  if (!plan) {
    const { data: latestPlan } = await admin
      .from('job_monthly_checklist_plans')
      .select('plan')
      .eq('job_position_id', profile.job_position_id)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()
    plan = latestPlan
  }

  const planDays = (Array.isArray(plan?.plan) ? plan.plan : []) as ChecklistPlanDay[]
  const matchingDay = planDays.find(day => day.date === date)
  const templateDay = matchingDay ?? planDays[0]
  const questions = Array.isArray(templateDay?.questions) ? templateDay.questions : []
  const checklistType = templateDay?.checklist_type ?? checklistModeForJobRole(job?.role_type)

  const { data, error } = await admin
    .from('iso_checklist_instances')
    .insert({
      user_id: profile.id,
      checklist_date: date,
      job_position_id: profile.job_position_id,
      factory_id: profile.factory_id,
      department_id: profile.department_id,
      checklist_type: checklistType,
      questions,
      responses: {},
      status: 'not_started',
    })
    .select('id, user_id, checklist_date, job_position_id, factory_id, department_id, checklist_type, questions, responses, status, late_reason, submitted_at, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export function checklistProgress(instance: ChecklistInstance | null | undefined) {
  const questions = Array.isArray(instance?.questions) ? instance.questions : []
  const responses = instance?.responses && typeof instance.responses === 'object' ? instance.responses : {}
  const answered = questions.filter((question, index) => {
    const key = questionKey(question, index)
    return Boolean(responses[key]?.answer)
  }).length
  const failures = questions.filter((question, index) => {
    const key = questionKey(question, index)
    return responses[key]?.answer === 'fail'
  }).length

  return { total: questions.length, answered, failures }
}

export function questionKey(question: ChecklistQuestion, index: number) {
  return String(question?.id ?? `${question?.process_id ?? 'question'}:${index}`)
}
