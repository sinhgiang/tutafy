'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, Settings, ChevronRight, Calendar, MessageCircle, Star, X, UserPlus, Clock, Volume2, VolumeX, Users, Search, Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import { FeedbackButton } from '@/components/FeedbackButton'
import type { Tutor } from '@/types'
import { pageTitleOf } from '@/lib/page-titles'
import { OPEN_COMMAND_EVENT } from './CommandPalette'
import { THEME_EVENT, toggleTheme } from './theme-client'

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
  if (type === 'student') return <div className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0"><UserPlus className="h-3.5 w-3.5 text-emerald-500" /></div>
  if (type === 'waitlist') return <div className="w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0"><Clock className="h-3.5 w-3.5 text-purple-500" /></div>
  return <div className="w-7 h-7 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0"><Star className="h-3.5 w-3.5 text-amber-500" /></div>
}

export function Header({ tutor, canViewAsStudent = false }: { tutor: Tutor; canViewAsStudent?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const [dark, setDark] = useState(false)
  const [mac, setMac] = useState(false)
  const lastSeenRef = useRef<string>('')
  const prevUnreadRef = useRef<number | null>(null)
  const soundOnRef = useRef(true) // read inside the poll closure without stale state
  const audioCtxRef = useRef<AudioContext | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const initials = tutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  // The name comes from the menu list (src/lib/page-titles.ts), so a page added to the menu is named here too.
  const pageLabel = pageTitleOf(pathname) ?? 'Tutafy'

  // Count how many notifications arrived after the tutor last opened the bell
  function countUnseen(items: Notification[], lastSeen: string): number {
    if (!lastSeen) return items.length
    const cutoff = new Date(lastSeen).getTime()
    return items.filter(n => new Date(n.time).getTime() > cutoff).length
  }

  // Lazily get the single shared AudioContext. Browsers create it "suspended"
  // when it's not made during a user gesture, so we also try to resume it.
  function getAudioCtx(): AudioContext | null {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext
        if (!AC) return null
        audioCtxRef.current = new AC()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
      return audioCtxRef.current
    } catch {
      return null
    }
  }

  // Short two-tone "ting" (like Facebook) synthesized via Web Audio — no asset,
  // so it works offline and can't be blocked by any content policy.
  function playDing() {
    if (!soundOnRef.current) return
    try {
      const ctx = getAudioCtx()
      if (!ctx || ctx.state !== 'running') return // still locked → stay silent
      const now = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.type = 'sine'
      o.frequency.setValueAtTime(880, now)          // first note
      o.frequency.setValueAtTime(1320, now + 0.11)  // second, higher note
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
      o.start(now)
      o.stop(now + 0.36) // shared context stays open for the next ding
    } catch { /* audio not available */ }
  }

  // Show a real desktop/system notification (works even when this tab is in the
  // background or another app is focused). Requires the user to have granted
  // permission through the notice bar (components/layout/NoticeBar.tsx).
  function notifyDesktop(item: Notification) {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return
      if (window.Notification.permission !== 'granted') return
      const n = new window.Notification(item.title, {
        body: item.body || 'Tutafy',
        tag: item.id, // collapses duplicates of the same event
        icon: '/favicon.ico',
      })
      n.onclick = () => {
        window.focus()
        window.location.href = item.link
        n.close()
      }
    } catch { /* Notification constructor can throw on some platforms */ }
  }

  // Unlock audio on the first user interaction anywhere on the page, so that
  // later dings (fired from a background timer) are allowed to make sound.
  useEffect(() => {
    function unlock() {
      const ctx = getAudioCtx()
      if (ctx && ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock)
        window.removeEventListener('keydown', unlock)
      }
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Poll notifications live: every 15s + whenever the tab regains focus,
  // so the bell shows a running count (1, 2, 3…) like Facebook without reloading.
  useEffect(() => {
    lastSeenRef.current = localStorage.getItem('tutafy_notif_seen') ?? ''
    const savedSound = localStorage.getItem('tutafy_notif_sound')
    const on = savedSound !== 'off' // default on
    soundOnRef.current = on
    setSoundOn(on)

    let active = true
    async function poll() {
      try {
        const r = await fetch('/api/notifications', { cache: 'no-store' })
        const d = await r.json()
        if (!active) return
        const items: Notification[] = d.notifications ?? []
        setNotifs(items)
        const nextUnread = countUnseen(items, lastSeenRef.current)
        // Play the sound only when the count actually goes up (a genuinely new
        // notification), and never on the very first poll after page load.
        if (prevUnreadRef.current !== null && nextUnread > prevUnreadRef.current) {
          playDing()
          // Fire a desktop popup for the newest item — most useful when this tab
          // isn't the one in focus (they're on another tab or app).
          if (document.hidden && items[0]) notifyDesktop(items[0])
        }
        prevUnreadRef.current = nextUnread
        setUnread(nextUnread)
      } catch { /* ignore transient errors */ }
    }
    poll()
    const interval = setInterval(poll, 15000)
    const onFocus = () => poll()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
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

  // Which theme is drawn (for the button's label and icon) and which shortcut word to show: Cmd on a Mac, Ctrl elsewhere.
  useEffect(() => {
    const read = () => setDark(document.querySelector('.dash')?.getAttribute('data-theme') === 'dark')
    read()
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) // eslint-disable-line react-hooks/set-state-in-effect -- the platform can only be read in the browser, after the page is drawn
    window.addEventListener(THEME_EVENT, read)
    return () => window.removeEventListener(THEME_EVENT, read)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    soundOnRef.current = next
    localStorage.setItem('tutafy_notif_sound', next ? 'on' : 'off')
    if (next) playDing() // little preview so the user hears it's back on
  }

  function openNotif() {
    const next = !notifOpen
    setNotifOpen(next)
    if (next) {
      // Opening the bell marks everything currently shown as seen → clears the badge
      const now = new Date().toISOString()
      localStorage.setItem('tutafy_notif_seen', now)
      lastSeenRef.current = now
      prevUnreadRef.current = 0
      setUnread(0)
    }
  }

  return (
    <>
    <header className="dash-top" data-dash-topbar>
      {/* Breadcrumb: the page name comes from the menu list */}
      <div className="dash-crumb">
        <span className="dash-crumb-root">Tutafy</span>
        <ChevronRight className="dash-crumb-root h-3.5 w-3.5" aria-hidden="true" />
        <strong data-testid="page-title">{pageLabel}</strong>
      </div>

      {/* Command bar button: the same box opens with Ctrl or Cmd K */}
      <button type="button" className="dash-search" data-testid="open-command" aria-label="Search pages and actions"
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_EVENT))}>
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Search or jump to</span>
        <kbd>{mac ? 'Cmd K' : 'Ctrl K'}</kbd>
      </button>

      {/* Right */}
      <div className="dash-top-actions">
        {/* A tutor who is also a student of another tutor (T-0676); a plain link, the server decides where it goes */}
        {canViewAsStudent && (
          <a href="/api/student/view-as" data-testid="view-as-student"
            className="hidden sm:inline-flex items-center text-[12px] font-semibold text-indigo-600 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-lg px-3 py-1.5">
            View as student
          </a>
        )}
        {/* Feedback box (T-0723): a small button, icon only on a phone */}
        <FeedbackButton iconOnlyOnPhone />
        {/* Theme: light or dark, kept in this browser */}
        <button type="button" onClick={toggleTheme} className="dash-icon-btn" data-testid="theme-toggle"
          aria-label={dark ? 'Switch to the light theme' : 'Switch to the dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>
          {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button onClick={openNotif} aria-label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'} className="dash-icon-btn">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unread > 0 && (
              <span className="dash-dot">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {/* Notification panel */}
          {notifOpen && (
            <div className="dash-panel fixed left-2 right-2 top-[64px] md:absolute md:left-auto md:right-0 md:top-10 md:w-[340px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-[13px] font-semibold text-gray-900">Notifications</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleSound}
                    title={soundOn ? 'Sound on — click to mute' : 'Muted — click to enable sound'}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      soundOn ? 'text-indigo-500 hover:bg-indigo-50' : 'text-gray-300 hover:bg-gray-100'
                    }`}>
                    {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setNotifOpen(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
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

        <div className="w-px h-5 bg-gray-200 mx-1" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent">
            <Avatar className="h-7 w-7">
              <AvatarImage src={tutor.avatar_url ?? undefined} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden xl:block text-left">
              <p className="text-[13px] font-semibold text-gray-800 leading-none">{tutor.name}</p>
              <p className="text-[13px] text-gray-500 mt-1 leading-none truncate max-w-[140px]">{tutor.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[13px] font-semibold text-foreground">{tutor.name}</p>
              <p className="text-[13px] text-muted-foreground truncate">{tutor.email}</p>
            </div>
            {canViewAsStudent && (
              <DropdownMenuItem onClick={() => window.location.assign('/api/student/view-as')} className="gap-2 text-[13px] mt-1 sm:hidden">
                <Users className="h-3.5 w-3.5" />
                View as student
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2 text-[13px] mt-1">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-[13px] text-red-600 dark:text-red-400 focus:text-red-600">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    </>
  )
}
