import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'

export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  link?: string
) {
  void supabase
  const admin = createAdminClient()
  await admin.from('notifications').insert({ user_id: userId, title, body, link })
}

export async function createNotifications(
  userIds: string[],
  title: string,
  body: string,
  link?: string
) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (!uniqueUserIds.length) return

  const admin = createAdminClient()
  await admin.from('notifications').insert(
    uniqueUserIds.map(userId => ({ user_id: userId, title, body, link }))
  )
}

// Notify users who can approve quality records.
export async function notifyManagers(
  supabase: SupabaseClient,
  title: string,
  body: string,
  link?: string,
  factoryId?: string | null
) {
  void supabase
  const admin = createAdminClient()
  const { data: managers } = await admin
    .from('users')
    .select('id, role, factory_id')
    .in('role', ['super_admin', 'coo', 'factory_admin'])

  const recipients = (managers ?? []).filter(manager =>
    manager.role === 'super_admin'
    || manager.role === 'coo'
    || !factoryId
    || manager.factory_id === factoryId
  )
  if (!recipients.length) return

  await admin.from('notifications').insert(
    recipients.map(m => ({ user_id: m.id, title, body, link }))
  )
}
