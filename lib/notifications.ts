import type { SupabaseClient } from '@supabase/supabase-js'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  link?: string
) {
  await supabase.from('notifications').insert({ user_id: userId, title, body, link })
}

// Notify all qa_managers
export async function notifyManagers(
  supabase: SupabaseClient,
  title: string,
  body: string,
  link?: string
) {
  const { data: managers } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'qa_manager')

  if (!managers?.length) return

  await supabase.from('notifications').insert(
    managers.map(m => ({ user_id: m.id, title, body, link }))
  )
}
