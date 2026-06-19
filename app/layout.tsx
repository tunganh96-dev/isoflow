import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: 'ISOFlow',
  description: 'Hệ thống quản lý tuân thủ ISO 9001',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={GeistSans.variable}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
