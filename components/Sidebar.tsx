'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, AlertTriangle, Settings, LogOut, ClipboardCheck, ArrowRightLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { vi } from '@/lib/i18n/vi'
import type { AppUser } from '@/types'
import { ROLE_LABELS, canManageSettings } from '@/lib/roles'

export default function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname()
  const navItems = [
    { href: '/dashboard', label: vi.nav_dashboard, icon: LayoutDashboard, show: true },
    { href: '/checklists', label: 'Checklist ISO', icon: ClipboardCheck, show: true },
    { href: '/cross-audit', label: 'Kiểm tra chéo', icon: ArrowRightLeft, show: user.role === 'department_head' || canManageSettings(user.role) },
    { href: '/documents', label: vi.nav_documents, icon: FileText, show: true },
    { href: '/ncr', label: vi.nav_ncr, icon: AlertTriangle, show: true },
    { href: '/settings', label: 'Cài đặt', icon: Settings, show: canManageSettings(user.role) },
  ].filter((item) => item.show)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-44 bg-white border-r border-gray-200 h-dvh sticky top-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              IS
            </div>
            <span className="font-bold text-sm text-gray-900">ISOFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Notification bell + User + logout */}
        <div className="px-2 py-3 border-t border-gray-200">
          <div className="px-2.5 mb-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut size={16} />
            {vi.logout}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center pt-2 pb-1 text-[11px] font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <Icon size={20} className="mb-0.5" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
