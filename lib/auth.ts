import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { AppUser } from '@/types'
import { canManageSettings } from '@/lib/roles'

const loadCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, role, factory_id, department_id, job_position_id, password_changed_at, force_password_change, created_at')
    .eq('id', user.id)
    .single()

  return profile as AppUser | null
})

// Get current authenticated user with role data. Redirects to /login if not authenticated.
export async function getCurrentUser(): Promise<AppUser> {
  const user = await loadCurrentUser()
  if (!user) redirect('/login')
  return user
}

// Get current user without redirect (returns null if not authenticated)
export async function getCurrentUserOrNull(): Promise<AppUser | null> {
  return loadCurrentUser()
}

// Require an admin role — redirects to /dashboard if not
export async function requireManager(): Promise<AppUser> {
  const user = await getCurrentUser()
  if (!canManageSettings(user.role)) {
    redirect('/dashboard')
  }
  return user
}
