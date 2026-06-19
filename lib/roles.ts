import type { UserRole } from '@/types'

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  coo: 'COO',
  factory_admin: 'Quản lý nhà máy',
  department_head: 'Trưởng bộ phận',
  employee: 'Nhân viên',
}

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  coo: 'bg-indigo-100 text-indigo-700',
  factory_admin: 'bg-blue-100 text-blue-700',
  department_head: 'bg-teal-100 text-teal-700',
  employee: 'bg-gray-100 text-gray-600',
}

export const ORG_ROLE_ORDER: UserRole[] = [
  'super_admin',
  'coo',
  'factory_admin',
  'department_head',
  'employee',
]

export function isSuperAdminRole(role: string | null | undefined) {
  return role === 'super_admin'
}

export function isAdminRole(role: string | null | undefined) {
  return ['super_admin', 'coo', 'factory_admin'].includes(role ?? '')
}

export function isManagerRole(role: string | null | undefined) {
  return ['super_admin', 'coo', 'factory_admin', 'department_head'].includes(role ?? '')
}

export function canManageSettings(role: string | null | undefined) {
  return isAdminRole(role)
}

export function canCreateQualityRecord(role: string | null | undefined) {
  return ['super_admin', 'coo', 'factory_admin', 'department_head'].includes(role ?? '')
}

export function canApproveQualityRecord(role: string | null | undefined) {
  return isAdminRole(role)
}

export function canWorkOnDocument({
  role,
  userId,
  userDepartmentId,
  ownerId,
  assignedDepartmentIds,
}: {
  role: string | null | undefined
  userId: string
  userDepartmentId: string | null
  ownerId: string
  assignedDepartmentIds: string[]
}) {
  return isAdminRole(role)
    || ownerId === userId
    || (
      role === 'department_head'
      && Boolean(userDepartmentId)
      && assignedDepartmentIds.includes(userDepartmentId as string)
    )
}
