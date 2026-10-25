'use client'

// The one notice bar of the tutor app (T-0820): the cookie notice and the "enable notifications" prompt,
// one at a time, in the page flow under the top bar so it never covers a table row or the phone menu.
// Which one is shown is decided by nextNotice() in src/lib/notice-bar.ts.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Cookie } from 'lucide-react'
import { getConsent, saveConsent } from '@/components/CookieConsent'
import { nextNotice, type NoticeState } from '@/lib/notice-bar'

const PUSH_DISMISSED_KEY = 'tutafy_notif_banner'

function readState(): NoticeState {
  let pushDismissed = false
  try { pushDismissed = sessionStorage.getItem(PUSH_DISMISSED_KEY) === 'closed' } catch { /* private window */ }
  const permission = 'Notification' in window ? window.Notification.permission : 'unsupported'
  return { consent: getConsent(), permission, pushDismissed, ready: true }
}

export function NoticeBar() {
  const [state, setState] = useState<NoticeState>({ consent: null, permission: 'unsupported', pushDismissed: false, ready: false })
  useEffect(() => { setState(readState()) }, []) // eslint-disable-line react-hooks/set-state-in-effect -- the browser's own choices can only be read after the page is drawn

  const kind = nextNotice(state)
  if (!kind) return null

  function chooseCookies(choice: 'accepted' | 'declined') {
    saveConsent(choice)
    setState(readState())
  }
  async function enableNotifications() {
    try {
      const p = await window.Notification.requestPermission()
      if (p === 'granted') new window.Notification('Tutafy notifications are on', { body: 'You will get an alert for new messages, bookings and students.', icon: '/icon-192.png' })
    } catch { /* the browser refused to ask */ }
    setState(readState())
  }
  function later() {
    try { sessionStorage.setItem(PUSH_DISMISSED_KEY, 'closed') } catch { /* private window */ }
    setState(readState())
  }

  if (kind === 'cookie') {
    return (
      <div className="dash-notice" role="region" aria-label="Cookies" data-notice="cookie">
        <Cookie aria-hidden="true" />
        <p><b>We value your privacy.</b> We use cookies to run the site and, with your consent, to measure our marketing. See our <Link href="/privacy">Privacy Policy</Link>.</p>
        <div className="dash-notice-actions">
          <button type="button" className="dash-btn is-primary" onClick={() => chooseCookies('accepted')}>Accept</button>
          <button type="button" className="dash-btn" onClick={() => chooseCookies('declined')}>Decline</button>
        </div>
      </div>
    )
  }
  if (kind === 'push') {
    return (
      <div className="dash-notice" role="region" aria-label="Notifications" data-notice="push">
        <Bell aria-hidden="true" />
        <p><b>Turn on notifications.</b> Get a bell and a sound for new messages, bookings and students, even when you are on another tab.</p>
        <div className="dash-notice-actions">
          <button type="button" className="dash-btn is-primary" onClick={enableNotifications}>Turn on</button>
          <button type="button" className="dash-btn" onClick={later}>Later</button>
        </div>
      </div>
    )
  }
  return (
    <div className="dash-notice" role="region" aria-label="Notifications" data-notice="push-blocked">
      <Bell aria-hidden="true" />
      <p><b>Notifications are blocked in this browser.</b> To turn them on, open the lock icon next to the web address, set Notifications to Allow, then reload.</p>
      <div className="dash-notice-actions">
        <button type="button" className="dash-btn is-primary" onClick={() => window.location.reload()}>Reload page</button>
        <button type="button" className="dash-btn" onClick={later}>Later</button>
      </div>
    </div>
  )
}
