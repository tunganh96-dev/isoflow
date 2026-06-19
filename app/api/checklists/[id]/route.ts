import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checklistProgress, questionKey } from '@/lib/iso-checklists'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: instance } = await admin
    .from('iso_checklist_instances')
    .select('id, user_id, checklist_date, checklist_type, questions, responses, status, late_reason, submitted_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!instance) return NextResponse.json({ error: 'Không tìm thấy checklist' }, { status: 404 })
  if (instance.status === 'submitted') return NextResponse.json({ error: 'Checklist đã được nộp' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const responses = body.responses && typeof body.responses === 'object' ? body.responses : instance.responses
  const submit = body.submit === true
  const lateReason = typeof body.late_reason === 'string' ? body.late_reason.trim() : ''

  if (submit) {
    const questions = Array.isArray(instance.questions) ? instance.questions : []
    const incomplete = questions.some((question: any, index: number) => {
      const response = responses[questionKey(question, index)]
      if (!response?.answer) return true
      return response.answer === 'fail' && !String(response.comment ?? '').trim()
    })
    if (incomplete) {
      return NextResponse.json({ error: 'Vui lòng trả lời tất cả câu hỏi và ghi lý do cho mục Không đạt' }, { status: 400 })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (instance.checklist_date < today && !lateReason) {
      return NextResponse.json({ error: 'Vui lòng nhập lý do hoàn thành trễ' }, { status: 400 })
    }
  }

  const { data, error } = await admin
    .from('iso_checklist_instances')
    .update({
      responses,
      status: submit ? 'submitted' : Object.keys(responses).length ? 'in_progress' : 'not_started',
      late_reason: submit ? lateReason || null : instance.late_reason,
      submitted_at: submit ? new Date().toISOString() : instance.submitted_at,
    })
    .eq('id', params.id)
    .select('id, user_id, checklist_date, checklist_type, questions, responses, status, late_reason, submitted_at')
    .single()

  if (error) return NextResponse.json({ error: 'Không thể lưu checklist' }, { status: 500 })
  return NextResponse.json({ checklist: { ...data, progress: checklistProgress(data) } })
}
