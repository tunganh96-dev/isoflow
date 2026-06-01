import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ISOFlow',
  description: 'Hệ thống quản lý tuân thủ ISO 9001',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}
