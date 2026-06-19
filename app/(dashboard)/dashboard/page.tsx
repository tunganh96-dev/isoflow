import { getCurrentUser } from '@/lib/auth'
import { vi } from '@/lib/i18n/vi'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{vi.dashboard_title}</h1>
      <p className="text-sm text-gray-500">Xin chào, {user.full_name}</p>
      {/* Dashboard module built in Feature 9 */}
    </div>
  )
}
