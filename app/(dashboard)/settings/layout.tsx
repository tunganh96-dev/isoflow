'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const backHref = pathname === '/settings' ? '/dashboard' : '/settings'

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href={backHref} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Cài đặt</h1>
      </div>

      {children}
    </div>
  )
}
