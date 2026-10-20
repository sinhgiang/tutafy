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
//  - The tag never reports the real address of a page (T-0637). gtag.js would send
//    document.location, and that can hold a student's portal code, a record id or a
//    login code. So `config` is called with send_page_view false, the page address,
//    path, title and referrer are written by src/lib/google-page.ts (no code, no id, no
//    query, only a few campaign parameters on a public page), the page_view is sent by
//    hand, every event carries the same safe address, and nothing is sent or loaded on a
//    page that opens private data (isSecretPath).
import { googlePageParams, isSecretPath, SECRET_PATH_SOURCE, type GooglePage } from '@/lib/google-page'

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
  /** The pathname of the page the visitor is on: nothing loads on a page that opens private data. */
  path?: string | null
}): GoogleTagPlan {
  if (opts.consent !== 'accepted') return { loaderId: null, configIds: [] }
  if (isSecretPath(opts.path)) return { loaderId: null, configIds: [] }
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
export function googleTagBootstrapScript(configIds: string[], page?: GooglePage): string {
  const ids = configIds.map(cleanId).filter((id): id is string => !!id)
  // Written into the page script: JSON of values made by google-page.ts (no "<" is possible there, but it is escaped anyway)
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')
  const set = page ? `gtag('set',${json(page)});` : ''
  // send_page_view false: gtag.js must not send the page view with the real address; Analytics.tsx sends it with the safe one
  const configs = ids.map(id => `gtag('config','${id}',${json({ send_page_view: false, ...(page ?? {}) })});`).join('')
  return (
    googleTagGuardScript(ids) +
    `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
    `window.gtag=gtag;gtag('js',new Date());${set}${configs}` +
    `window.__tutafyGtagReady=true;` +
    `(window.__tutafyGtagPending||[]).forEach(function(a){gtag.apply(null,a);});` +
    `window.__tutafyGtagPending=[];`
  )
}

/**
 * A tag that is already loaded cannot be unloaded, and gtag.js sends its own page view when the
 * address changes without a page load (Enhanced Measurement, "page changes based on browser history
 * events"), with the real address. So, before any of that can happen, this script watches the
 * address and sets the documented switch `window['ga-disable-<id>']` while the visitor is on a page
 * that opens private data (the same SECRET_PATH_SOURCE as isSecretPath), and clears it on any other page.
 */
export function googleTagGuardScript(ids: string[]): string {
  return (
    `(function(){if(!(window.history&&window.location&&window.addEventListener&&window.URL))return;` +
    `var re=new RegExp(${JSON.stringify(SECRET_PATH_SOURCE)});var ids=${JSON.stringify(ids)};` +
    `function mark(p){var s=re.test(p);for(var i=0;i<ids.length;i++)window['ga-disable-'+ids[i]]=s;}` +
    `function path(u){try{return new URL(u==null?location.href:u,location.href).pathname}catch(e){return location.pathname}}` +
    `['pushState','replaceState'].forEach(function(m){var o=history[m];if(!o)return;` +
    `history[m]=function(s,t,u){mark(path(u));return o.apply(this,arguments)}});` +
    `window.addEventListener('popstate',function(){mark(location.pathname)});` +
    `mark(location.pathname);})();`
  )
}

type GtagWindow = {
  location?: { origin: string; pathname: string; search?: string }
  document?: { referrer?: string; title?: string }
  __tutafyLastPage?: string
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

/** The safe description of the page this window shows, or null when the window has no address (a test, a server). */
function safePageOf(w: GtagWindow): GooglePage | null {
  const l = w.location
  if (!l || typeof l.pathname !== 'string' || typeof l.origin !== 'string') return null
  return googlePageParams({ origin: l.origin, pathname: l.pathname, search: l.search, referrer: w.document?.referrer, title: w.document?.title })
}

function sendGtag(win: object, consent: ConsentState, args: unknown[]): void {
  if (consent !== 'accepted') return
  const w = win as GtagWindow
  if (isSecretPath(w.location?.pathname)) return // a page that opens private data reports nothing
  if (args[0] === 'event') {
    // every event says where it happened with the safe address, never the real one
    const page = safePageOf(w)
    if (page) args = [args[0], args[1], { ...(args[2] as object | undefined), page_location: page.page_location, page_path: page.page_path }]
  }
  // Never push to dataLayer by hand: gtag.js ignores anything but the `arguments` object gtag() pushes.
  if (w.__tutafyGtagReady && w.gtag) w.gtag(...args)
  else (w.__tutafyGtagPending ||= []).push(args)
}

/**
 * The page view, sent by hand with the safe address (config has send_page_view false). Called by
 * Analytics.tsx for the first page and for every page change. Sends nothing on a page that opens
 * private data (its safe name is still remembered, so the next page's referrer is a placeholder,
 * never the real address).
 */
export function sendGooglePageView(win: object, consent: ConsentState): void {
  if (consent !== 'accepted') return
  const w = win as GtagWindow
  const page = safePageOf(w)
  if (!page) return
  const previous = w.__tutafyLastPage
  w.__tutafyLastPage = page.page_location
  if (isSecretPath(w.location?.pathname)) return
  const params = { ...page, page_referrer: previous ?? page.page_referrer }
  sendGtag(win, consent, ['set', params])
  sendGtag(win, consent, ['event', 'page_view', params])
}

/** begin_checkout: the plan only (pro or academy). */
export function beginCheckoutParams(plan: 'pro' | 'academy'): Record<string, unknown> {
  return { items: [{ item_id: plan, item_name: `Tutafy ${plan === 'pro' ? 'Pro' : 'Academy'}` }] }
}
