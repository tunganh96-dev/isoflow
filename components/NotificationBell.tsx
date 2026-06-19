'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { vi } from '@/lib/i18n/vi'
import type { Notification } from '@/types'
import Link from 'next/link'

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('id, user_id, title, body, link, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markAllRead() {
    const response = await fetch('/api/notifications', { method: 'PATCH' })
    if (!response.ok) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!response.ok) return
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function formatTime(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} phút trước`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} giờ trước`
    return `${Math.floor(hrs / 24)} ngày trước`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); fetchNotifications() }}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label={vi.nav_notifications}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 text-xs font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 md:left-0 md:right-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">{vi.nav_notifications}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:underline">
                {vi.notif_mark_all_read}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">Không có thông báo</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 ${!n.read ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => { markRead(n.id); setOpen(false) }}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate"
                        >
                          {n.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5"
                        aria-label={vi.notif_mark_read}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
