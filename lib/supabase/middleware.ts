import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isApiRoute = pathname.startsWith('/api/')

  // API handlers return their own JSON 401 responses.
  if (!user && !isApiRoute && !pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (user && pathname.startsWith('/login')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'employee' ? '/checklists' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Force password change check
  if (user && !isApiRoute && !pathname.startsWith('/login') && !pathname.startsWith('/auth') && !pathname.startsWith('/change-password')) {
    const { data: profile } = await supabase
      .from('users')
      .select('password_changed_at, force_password_change')
      .eq('id', user.id)
      .single()

    if (profile) {
      const mustChange = profile.force_password_change
        || !profile.password_changed_at
        || (Date.now() - new Date(profile.password_changed_at).getTime() > 180 * 24 * 60 * 60 * 1000) // 6 months
      if (mustChange) {
        const url = request.nextUrl.clone()
        url.pathname = '/change-password'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
