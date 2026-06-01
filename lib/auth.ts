import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AppUser } from '@/types'

// Get current authenticated user with role data. Redirects to /login if not authenticated.
export async function getCurrentUser(): Promise<AppUser> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return profile as AppUser
}

// Get current user without redirect (returns null if not authenticated)
export async function getCurrentUserOrNull(): Promise<AppUser | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as AppUser | null
}

// Require qa_manager role — redirects to /dashboard if not
export async function requireManager(): Promise<AppUser> {
  const user = await getCurrentUser()
  if (user.role !== 'qa_manager') {
    redirect('/dashboard')
  }
  return user
}
