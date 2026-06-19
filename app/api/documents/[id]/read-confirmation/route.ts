import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeLearningAssets } from '@/lib/learning-assets'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers } = await request.json().catch(() => ({}))
  if (!Array.isArray(answers)) {
    return NextResponse.json({ error: 'Thiếu câu trả lời' }, { status: 400 })
  }

  const { data: row } = await supabase
    .from('document_learning_assets')
    .select('quiz')
    .eq('document_id', params.id)
    .single()

  if (!row) {
    return NextResponse.json({ error: 'Tài liệu chưa có bài kiểm tra' }, { status: 404 })
  }

  const assets = normalizeLearningAssets({ quiz: row.quiz })
  const total = assets.quiz.length
  const score = assets.quiz.reduce((count, question, index) => (
    Number(answers[index]) === question.correct_answer ? count + 1 : count
  ), 0)
  const passed = total > 0 && score === total

  const { error } = await supabase
    .from('document_read_confirmations')
    .upsert({
      document_id: params.id,
      user_id: user.id,
      quiz_answers: answers,
      score,
      total,
      passed,
      confirmed_at: passed ? new Date().toISOString() : null,
    }, { onConflict: 'document_id,user_id' })

  if (error) {
    console.error('Read confirmation error:')
    return NextResponse.json({ error: 'Không thể lưu xác nhận đọc' }, { status: 500 })
  }

  return NextResponse.json({ passed, score, total })
}
