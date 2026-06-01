import { getCurrentUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile + desktop header) */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          {/* Mobile: app name */}
          <span className="font-semibold text-gray-900 md:hidden">ISOFlow</span>
          {/* Desktop: spacer */}
          <span className="hidden md:block" />

          <NotificationBell userId={user.id} />
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
