import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth'
import { DEFAULT_AI_PROMPTS } from '@/lib/ai-prompt-library'
import AiPromptEditor from './AiPromptEditor'

export default async function AiPromptsSettingsPage() {
  await requireManager()
  const supabase = createClient()

  const { data: savedPrompts } = await supabase
    .from('ai_prompts')
    .select('id, key, name, description, content, is_active, updated_at')
    .order('updated_at', { ascending: false })

  const savedByKey = new Map((savedPrompts ?? []).map((prompt: any) => [prompt.key, prompt]))
  const prompts = [
    ...DEFAULT_AI_PROMPTS.map(prompt => savedByKey.get(prompt.key) ?? prompt),
    ...(savedPrompts ?? []).filter((prompt: any) => !DEFAULT_AI_PROMPTS.some(defaultPrompt => defaultPrompt.key === prompt.key)),
  ]

  return <AiPromptEditor prompts={prompts} />
}
