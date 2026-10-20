'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { getConsent, CONSENT_EVENT } from './CookieConsent'
import { captureLanding, forgetMe, sendTrack, takeLanding } from '@/lib/track-client'
import { isAppPath, normalizeTrackedPath } from '@/lib/track-path'
import { pageViewPayload } from '@/lib/track-sender'

// Records the visitor's journey (page views of a short fixed list of pages) in
// Tutafy's own database, ONLY after the visitor accepted cookies. See
// supabase/migrations/015_visitor_tracking.sql and the Privacy page.
function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_EVENT, onChange)
}
const accepted = () => getConsent() === 'accepted'

export function VisitorTracker() {
  const pathname = usePathname()
  const consented = useSyncExternalStore(subscribe, accepted, () => false)

  // Remember how this tab arrived; it stays on the device until consent is given.
  useEffect(() => { captureLanding() }, [])

  // Declining (or withdrawing) deletes what was stored and the cookie.
  useEffect(() => {
    const onConsent = (e: Event) => { if ((e as CustomEvent).detail === 'declined') forgetMe() }
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])

  useEffect(() => {
    if (!consented) return
    const path = normalizeTrackedPath(pathname)
    if (!path) return
    // In the signed-in area the same request also links this visitor to the tutor account (once
    // per tab). One request, so the visitor and the link cannot end up on two different visitors.
    let linkAccount = false
    try {
      linkAccount = isAppPath(path) && !sessionStorage.getItem('tutafy_identified')
      if (linkAccount) sessionStorage.setItem('tutafy_identified', '1')
    } catch { /* storage blocked: skip the link, the page view still goes out */ }
    void sendTrack(pageViewPayload({ path, landing: takeLanding() as Record<string, unknown> | null, linkAccount }))
  }, [consented, pathname])

  return null
}
