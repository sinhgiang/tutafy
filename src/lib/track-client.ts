'use client'

// Browser side of the visitor journey. Nothing is sent unless the visitor accepted
// cookies (getConsent), and what is sent is only a shortened page path, the first
// referrer/utm of the visit, and a yes/no for a Google Ads click id.
import { getConsent } from '@/components/CookieConsent'

export type Landing = {
  referrer?: string
  utm?: { source?: string; medium?: string; campaign?: string }
  gclid?: boolean
}

const LANDING_KEY = 'tutafy_landing'
const LANDING_SENT_KEY = 'tutafy_landing_sent'

function safeSession<T>(fn: (s: Storage) => T): T | null {
  try {
    return fn(window.sessionStorage)
  } catch {
    return null
  }
}

/** Remember how this tab arrived. Stays on the device until (and unless) the visitor accepts cookies. */
export function captureLanding(): void {
  safeSession(s => {
    if (s.getItem(LANDING_KEY)) return
    const q = new URLSearchParams(window.location.search)
    const landing: Landing = {
      referrer: document.referrer || undefined,
      utm: { source: q.get('utm_source') ?? undefined, medium: q.get('utm_medium') ?? undefined, campaign: q.get('utm_campaign') ?? undefined },
      gclid: q.has('gclid') || undefined,
    }
    s.setItem(LANDING_KEY, JSON.stringify(landing))
  })
}

/** The landing info, once per tab: later calls return null. */
export function takeLanding(): Landing | null {
  return safeSession(s => {
    if (s.getItem(LANDING_SENT_KEY)) return null
    s.setItem(LANDING_SENT_KEY, '1')
    const raw = s.getItem(LANDING_KEY)
    return raw ? (JSON.parse(raw) as Landing) : null
  })
}

export function sendTrack(payload: Record<string, unknown>): void {
  if (getConsent() !== 'accepted') return
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent: 'accepted', ...payload }),
    keepalive: true,
  }).catch(() => { /* tracking never gets in the way */ })
}

/** Called when the visitor presses a Go Pro / upgrade button (before the page changes). */
export function trackCheckoutClick(plan: 'pro' | 'academy'): void {
  sendTrack({ kind: 'checkout_click', path: window.location.pathname, plan })
}

export function forgetMe(): void {
  fetch('/api/track', { method: 'DELETE', keepalive: true }).catch(() => { /* nothing to do */ })
}
