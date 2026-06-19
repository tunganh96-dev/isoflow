import { getCurrentUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex h-dvh bg-[#F7F6F3]">
      <Sidebar user={user} />
      <div className="fixed right-3 top-2.5 z-50 md:bottom-14 md:left-[8.25rem] md:right-auto md:top-auto">
        <NotificationBell userId={user.id} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header only */}
        <header className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900">ISOFlow</span>
          <span className="h-8 w-8" aria-hidden />
        </header>

        <main className="flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:p-6 md:pb-6 overflow-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
