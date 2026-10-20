// Google tag (gtag.js) for Google Analytics 4 and Google Ads. Pure helpers, so the
// rules can be tested without a browser; Analytics.tsx only renders what they say.
//
// Rules:
//  - Nothing loads and nothing is sent unless the visitor accepted cookies.
//  - gtag.js is loaded ONE time and `config` is called once per distinct ID.
//  - Events carry no personal data (no email, no name): only an event name and,
//    for begin_checkout, the plan; the Ads sign-up conversion carries only its label.
//  - Every event, the Ads conversion included, is a gtag('event', ...) call, so it is
//    pushed to dataLayer as an `arguments` object, the only shape gtag.js reads.

/** Public GA4 measurement ID of tutafy.com (a public ID, not a secret). Used when the env var is empty. */
export const DEFAULT_GA4_ID = 'G-QYDSQ8W6TX'

/** Public Google Ads ID of the Tutafy account (a public ID, not a secret). Always configured, so the sign-up conversion below has its destination even if the env var is empty. */
export const ADS_ID = 'AW-18335043737'

/** The Google Ads "Sign Up" conversion: account ID, a slash, then the conversion label. The label must not change without the owner. */
export const ADS_SIGNUP_CONVERSION = `${ADS_ID}/SHlACJ_tptgcEJmh6qZE`

// Only well-formed tag IDs are ever written into the page script or the loader URL.
const TAG_ID = /^(G|AW)-[A-Z0-9]{4,20}$/

export type ConsentState = 'accepted' | 'declined' | null

function cleanId(raw: string | undefined | null): string | null {
  // Vercel values can carry a BOM or stray whitespace; drop them before checking.
  const id = (raw ?? '').replace(/[\s﻿]/g, '').toUpperCase()
  return TAG_ID.test(id) ? id : null
}

export type GoogleTagPlan = {
  /** The ID in the gtag.js URL, or null when no tag may load. */
  loaderId: string | null
  /** Every ID that gets gtag('config'), each once. */
  configIds: string[]
}

/**
 * What to load for this visitor.
 * @param ga4Env    NEXT_PUBLIC_GA4_MEASUREMENT_ID (empty: DEFAULT_GA4_ID)
 * @param legacyEnv NEXT_PUBLIC_GA_MEASUREMENT_ID (the Google Ads "AW-" ID; an older "G-" value is not loaded twice)
 * The Tutafy Ads ID (ADS_ID) is always configured too, once, so the conversion has a destination.
 */
export function googleTagPlan(opts: {
  consent: ConsentState
  ga4Env?: string | null
  legacyEnv?: string | null
}): GoogleTagPlan {
  if (opts.consent !== 'accepted') return { loaderId: null, configIds: [] }
  const ids: string[] = []
  for (const id of [cleanId(opts.ga4Env) ?? DEFAULT_GA4_ID, cleanId(opts.legacyEnv), ADS_ID]) {
    if (id && !ids.includes(id)) ids.push(id)
  }
  return { loaderId: ids[0], configIds: ids }
}

export function googleTagLoaderUrl(loaderId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId)}`
}

/**
 * The inline script that starts gtag, after the loader is requested. Events asked for
 * before it ran wait in window.__tutafyGtagPending and are sent after `config`, so
 * they are never sent to a tag that is not set up yet.
 */
export function googleTagBootstrapScript(configIds: string[]): string {
  const ids = configIds.map(cleanId).filter((id): id is string => !!id)
  const configs = ids.map(id => `gtag('config','${id}');`).join('')
  return (
    `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
    `window.gtag=gtag;gtag('js',new Date());${configs}` +
    `window.__tutafyGtagReady=true;` +
    `(window.__tutafyGtagPending||[]).forEach(function(a){gtag.apply(null,a);});` +
    `window.__tutafyGtagPending=[];`
  )
}

type GtagWindow = {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  __tutafyGtagReady?: boolean
  __tutafyGtagPending?: unknown[][]
}

/**
 * Send a GA4 event. Does nothing unless the visitor accepted cookies. If the tag has
 * not started yet the event waits until it has; if the visitor never accepts, it is
 * never sent.
 */
export function sendGaEvent(
  win: object,
  consent: ConsentState,
  name: 'sign_up' | 'begin_checkout',
  params?: Record<string, unknown>,
): void {
  sendGtag(win, consent, params ? ['event', name, params] : ['event', name])
}

/**
 * The Google Ads "Sign Up" conversion: gtag('event','conversion',{send_to: ADS_SIGNUP_CONVERSION}).
 * Same rules as sendGaEvent: nothing unless the visitor accepted cookies, queued until
 * the tag has started. It carries the conversion label only, no personal data.
 */
export function sendAdsSignupConversion(win: object, consent: ConsentState): void {
  sendGtag(win, consent, ['event', 'conversion', { send_to: ADS_SIGNUP_CONVERSION }])
}

function sendGtag(win: object, consent: ConsentState, args: unknown[]): void {
  if (consent !== 'accepted') return
  const w = win as GtagWindow
  // Never push to dataLayer by hand: gtag.js ignores anything but the `arguments` object gtag() pushes.
  if (w.__tutafyGtagReady && w.gtag) w.gtag(...args)
  else (w.__tutafyGtagPending ||= []).push(args)
}

/** begin_checkout: the plan only (pro or academy). */
export function beginCheckoutParams(plan: 'pro' | 'academy'): Record<string, unknown> {
  return { items: [{ item_id: plan, item_name: `Tutafy ${plan === 'pro' ? 'Pro' : 'Academy'}` }] }
}
