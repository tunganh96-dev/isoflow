import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checklistProgress, ensureChecklistInstance, isDateString } from '@/lib/iso-checklists'
import { isAdminRole } from '@/lib/roles'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('id, full_name, role, factory_id, department_id, job_position_id, job_position:job_position_id(title, role_type)')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })

  const url = new URL(request.url)
  const view = url.searchParams.get('view') ?? 'mine'

  if (view === 'month') {
    const month = url.searchParams.get('month')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Tháng không hợp lệ' }, { status: 400 })
    }
    const factoryFilter = url.searchParams.get('factory_id')
    const scopedMonth = url.searchParams.get('scope') === '1'
      && (profile.role === 'department_head' || isAdminRole(profile.role))

    // Load factories list for coo/super_admin
    let factories: any[] = []
    if (['coo', 'super_admin'].includes(profile.role)) {
      const { data: factoriesData } = await admin.from('factories').select('id, name, code').order('name')
      factories = factoriesData ?? []
    }

    let instancesQuery = admin
      .from('iso_checklist_instances')
      .select('id, user_id, checklist_date, status, questions, responses, submitted_at')
      .gte('checklist_date', `${month}-01`)
      .lte('checklist_date', `${month}-31`)
      .order('checklist_date')
    if (!scopedMonth) instancesQuery = instancesQuery.eq('user_id', user.id)
    else if (profile.role === 'department_head') instancesQuery = instancesQuery.eq('department_id', profile.department_id)
    else if (profile.role === 'factory_admin') instancesQuery = instancesQuery.eq('factory_id', profile.factory_id)
    else if (factoryFilter) instancesQuery = instancesQuery.eq('factory_id', factoryFilter)
    const { data } = await instancesQuery

    if (scopedMonth) {
      let scopedUsersQuery = admin.from('users').select('id').not('job_position_id', 'is', null)
      if (profile.role === 'department_head') scopedUsersQuery = scopedUsersQuery.eq('department_id', profile.department_id)
      else if (profile.role === 'factory_admin') scopedUsersQuery = scopedUsersQuery.eq('factory_id', profile.factory_id)
      else if (factoryFilter) scopedUsersQuery = scopedUsersQuery.eq('factory_id', factoryFilter)
      const { data: scopedUsers } = await scopedUsersQuery
      const totalUsers = scopedUsers?.length ?? 0
      const grouped = new Map<string, any[]>()
      ;(data ?? []).forEach(instance => {
        const current = grouped.get(instance.checklist_date) ?? []
        current.push(instance)
        grouped.set(instance.checklist_date, current)
      })
      return NextResponse.json({
        scope: true,
        total_users: totalUsers,
        factories,
        days: Array.from(grouped.entries()).map(([checklistDate, instances]) => ({
          checklist_date: checklistDate,
          submitted: instances.filter(item => item.status === 'submitted').length,
          started: instances.filter(item => item.status === 'in_progress').length,
          failures: instances.reduce((sum, item) => sum + checklistProgress(item).failures, 0),
          total_users: totalUsers,
        })),
      })
    }

    return NextResponse.json({
      factories,
      days: (data ?? []).map(instance => ({ ...instance, progress: checklistProgress(instance) })),
    })
  }

  const date = url.searchParams.get('date')
  if (!isDateString(date)) return NextResponse.json({ error: 'Ngày không hợp lệ' }, { status: 400 })

  if (view === 'scope') {
    const canViewScope = profile.role === 'department_head' || isAdminRole(profile.role)
    if (!canViewScope) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

    // For coo/super_admin, allow filtering by factory
    const factoryFilter = url.searchParams.get('factory_id')

    let usersQuery = admin
      .from('users')
      .select('id, full_name, role, department_id, factory_id, department:department_id(name), factory:factory_id(id, name, code), job_position:job_position_id(title)')
      .not('job_position_id', 'is', null)
      .order('full_name')

    if (profile.role === 'department_head') usersQuery = usersQuery.eq('department_id', profile.department_id)
    else if (profile.role === 'factory_admin') usersQuery = usersQuery.eq('factory_id', profile.factory_id)
    else if (factoryFilter) usersQuery = usersQuery.eq('factory_id', factoryFilter)

    // Load factories list for coo/super_admin
    let factories: any[] = []
    if (['coo', 'super_admin'].includes(profile.role)) {
      const { data: factoriesData } = await admin.from('factories').select('id, name, code').order('name')
      factories = factoriesData ?? []
    }

    const { data: scopedUsers } = await usersQuery
    const userIds = (scopedUsers ?? []).map(item => item.id)
    const { data: instances } = userIds.length
      ? await admin
        .from('iso_checklist_instances')
        .select('id, user_id, checklist_date, status, questions, responses, submitted_at')
        .eq('checklist_date', date)
        .in('user_id', userIds)
      : { data: [] as any[] }
    const byUser = new Map((instances ?? []).map(instance => [instance.user_id, instance]))

    const usersWithChecklist = (scopedUsers ?? []).map(scopedUser => {
        const instance = byUser.get(scopedUser.id)
        return {
          ...scopedUser,
          checklist: instance ? { ...instance, progress: checklistProgress(instance) } : null,
        }
      })
    const departmentMap = new Map<string, any>()
    usersWithChecklist.forEach(item => {
      const key = item.department_id ?? 'none'
      const current = departmentMap.get(key) ?? {
        id: key,
        name: (item.department as any)?.name ?? 'Chưa có bộ phận',
        users: 0,
        submitted: 0,
        in_progress: 0,
        not_started: 0,
        failures: 0,
      }
      current.users += 1
      const status = item.checklist?.status ?? 'not_started'
      current[status] += 1
      current.failures += item.checklist?.progress?.failures ?? 0
      departmentMap.set(key, current)
    })

    return NextResponse.json({
      users: usersWithChecklist,
      departments: Array.from(departmentMap.values()),
      factories,
    })
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  if (date > today) {
    return NextResponse.json({ profile, checklist: null, future: true })
  }
  const instance = await ensureChecklistInstance(admin, profile, date)
  return NextResponse.json({
    profile,
    checklist: instance ? { ...instance, progress: checklistProgress(instance) } : null,
  })
}
