'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, Settings, ChevronRight, Calendar, MessageCircle, Star, X } from 'lucide-react'
import Link from 'next/link'
import type { Tutor } from '@/types'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/lessons': 'Lessons',
  '/calendar': 'Calendar',
  '/payments': 'Payments',
  '/availability': 'Availability',
  '/ai': 'AI Tools',
  '/settings': 'Settings',
}

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  link: string
  time: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'booking') return <div className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0"><Calendar className="h-3.5 w-3.5 text-indigo-500" /></div>
  if (type === 'message') return <div className="w-7 h-7 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0"><MessageCircle className="h-3.5 w-3.5 text-blue-500" /></div>
  return <div className="w-7 h-7 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0"><Star className="h-3.5 w-3.5 text-amber-500" /></div>
}

export function Header({ tutor }: { tutor: Tutor }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [notifLoaded, setNotifLoaded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const initials = tutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const segment = '/' + pathname.split('/')[1]
  const pageLabel = PAGE_LABELS[segment] ?? 'Tutafy'

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => { setNotifs(d.notifications ?? []); setUnread(d.unread ?? 0) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function openNotif() {
    setNotifOpen(v => !v)
    if (!notifLoaded) {
      setUnread(0)
      setNotifLoaded(true)
    }
  }

  return (
    <header className="h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-6 flex-shrink-0 relative z-30">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-gray-400 hidden sm:block">Tutafy</span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300 hidden sm:block" />
        <span className="font-semibold text-gray-900">{pageLabel}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button onClick={openNotif}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors relative">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Notification panel */}
          {notifOpen && (
            <div className="absolute right-0 top-10 w-[340px] bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-[13px] font-semibold text-gray-900">Notifications</p>
                <button onClick={() => setNotifOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-[12px] text-gray-400">No recent activity</p>
                </div>
              ) : (
                <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
                  {notifs.map(n => (
                    <Link key={n.id} href={n.link} onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-gray-900 leading-snug">{n.title}</p>
                        {n.body && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>}
                        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.time)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent">
            <Avatar className="h-7 w-7">
              <AvatarImage src={tutor.avatar_url ?? undefined} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-semibold text-gray-800 leading-none">{tutor.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-none truncate max-w-[120px]">{tutor.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[12px] font-semibold text-gray-900">{tutor.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{tutor.email}</p>
            </div>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2 text-[13px] mt-1">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-[13px] text-red-600 focus:text-red-600">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
