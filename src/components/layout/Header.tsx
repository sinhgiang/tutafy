'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, Settings, ChevronRight, Calendar, MessageCircle, Star, X, UserPlus, Clock, Volume2, VolumeX } from 'lucide-react'
import Link from 'next/link'
import type { Tutor } from '@/types'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/lessons': 'Lessons',
  '/calendar': 'Calendar',
  '/payments': 'Payments',
  '/reports': 'Reports',
  '/team': 'Team & Payroll',
  '/developers': 'API & Webhooks',
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
  if (type === 'student') return <div className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0"><UserPlus className="h-3.5 w-3.5 text-emerald-500" /></div>
  if (type === 'waitlist') return <div className="w-7 h-7 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0"><Clock className="h-3.5 w-3.5 text-purple-500" /></div>
  return <div className="w-7 h-7 bg-amber-50 rounded-full flex items-center justify-center flex-shrink-0"><Star className="h-3.5 w-3.5 text-amber-500" /></div>
}

export function Header({ tutor }: { tutor: Tutor }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const [permState, setPermState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default')
  const [bannerClosed, setBannerClosed] = useState(true) // start hidden until we read the real state client-side
  const lastSeenRef = useRef<string>('')
  const prevUnreadRef = useRef<number | null>(null)
  const soundOnRef = useRef(true) // read inside the poll closure without stale state
  const audioCtxRef = useRef<AudioContext | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const initials = tutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const segment = '/' + pathname.split('/')[1]
  const pageLabel = PAGE_LABELS[segment] ?? 'Tutafy'

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
  // permission via the banner below.
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

  // First-visit prompt: ask the browser for notification permission. Runs inside
  // the click gesture, which also unlocks audio, so sound starts working too.
  async function enableNotifications() {
    getAudioCtx() // unlock audio within this user gesture
    try {
      if (!('Notification' in window)) { setPermState('unsupported'); return }
      const p = await window.Notification.requestPermission()
      setPermState(p)
      if (p === 'granted') {
        setBannerClosed(true)
        playDing() // confirm sound works
        new window.Notification('Tutafy notifications are on 🔔', {
          body: 'You will get an alert for new messages, bookings and students.',
          icon: '/favicon.ico',
        })
      }
      // If the user picked "Block" (denied), keep the banner open — it now shows
      // manual unblock instructions instead of the request button.
    } catch { /* ignore */ }
  }

  // "Later" hides the prompt only for this browser session, so it reappears on
  // the next visit and keeps nudging until notifications are actually enabled.
  function dismissBanner() {
    setBannerClosed(true)
    try { sessionStorage.setItem('tutafy_notif_banner', 'closed') } catch { /* ignore */ }
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

    // Decide whether to show the "enable notifications" banner.
    // Show it for ANY user who hasn't granted permission yet (default OR denied),
    // not just brand-new visitors — unless they hid it earlier this session.
    if (!('Notification' in window)) {
      setPermState('unsupported')
      setBannerClosed(true)
    } else {
      const perm = window.Notification.permission
      setPermState(perm)
      let dismissed = false
      try { dismissed = sessionStorage.getItem('tutafy_notif_banner') === 'closed' } catch { /* ignore */ }
      setBannerClosed(perm === 'granted' || dismissed)
    }

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

    {/* Prompt to enable browser notifications — shown to anyone not yet granted */}
    {!bannerClosed && (permState === 'default' || permState === 'denied') && (
      <div className="fixed bottom-4 right-4 z-50 w-[340px] bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/60 p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${permState === 'denied' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
            <Bell className={`h-4 w-4 ${permState === 'denied' ? 'text-amber-500' : 'text-indigo-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            {permState === 'default' ? (
              <>
                <p className="text-[13px] font-semibold text-gray-900">Enable notifications</p>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">
                  Get an instant bell + sound for new messages, bookings or students — even when you're on another tab.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={enableNotifications}
                    className="flex-1 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-lg py-2">
                    Enable notifications
                  </button>
                  <button onClick={dismissBanner}
                    className="text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors px-3 py-2">
                    Later
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-gray-900">Notifications are blocked</p>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">
                  Your browser is blocking notifications for this site. To turn them back on:
                </p>
                <ol className="text-[12px] text-gray-500 mt-1.5 space-y-0.5 list-decimal list-inside leading-snug">
                  <li>Click the <span className="font-semibold">🔒 lock icon</span> next to the web address</li>
                  <li>Find <span className="font-semibold">Notifications</span> → choose <span className="font-semibold">Allow</span></li>
                  <li>Click the button below to reload</li>
                </ol>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => window.location.reload()}
                    className="flex-1 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-lg py-2">
                    Reload page
                  </button>
                  <button onClick={dismissBanner}
                    className="text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors px-3 py-2">
                    Later
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={dismissBanner} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )}
    </>
  )
}
