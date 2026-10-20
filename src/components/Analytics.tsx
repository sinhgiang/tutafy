'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { getConsent, CONSENT_EVENT } from './CookieConsent'
import { googleTagPlan, googleTagLoaderUrl, googleTagBootstrapScript, sendGooglePageView } from '@/lib/google-tag'
import { googlePageParams, isSecretPath } from '@/lib/google-page'

// Marketing tags for Facebook/Meta Ads (Pixel) and Google (gtag.js: Analytics 4 +
// Google Ads). They ONLY load once the visitor has accepted cookies, so nothing
// runs for a visitor who declined or has not chosen. Env vars on Vercel:
//   NEXT_PUBLIC_META_PIXEL_ID           (e.g. 1234567890)
//   NEXT_PUBLIC_GA_MEASUREMENT_ID       (Google Ads "AW-XXXX"; a "G-" value is not loaded twice)
//   NEXT_PUBLIC_GA4_MEASUREMENT_ID      (GA4 "G-XXXX"; empty: the default in src/lib/google-tag.ts)
// gtag.js is loaded once and configured for every distinct ID (see googleTagPlan).
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GA_ADS_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID

/** What the tag may know about the page it starts on (browser only: the tag renders after consent, never on the server). */
function safePage() {
  const { origin, pathname, search } = window.location
  return googlePageParams({ origin, pathname, search, referrer: document.referrer, title: document.title })
}

export function Analytics() {
  const [ok, setOk] = useState(false)
  const pathname = usePathname()
  const metaFirstPage = useRef(true)

  useEffect(() => {
    setOk(getConsent() === 'accepted')
    const onConsent = (e: Event) => setOk((e as CustomEvent).detail === 'accepted')
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])

  // The Google tag is not given the page it is on when that page opens private data (the student portal, a record id...):
  // the plan answers "no tag" there. (A tag that is already running is switched off on such a page by the guard in its start-up script.)
  const google = googleTagPlan({ consent: ok ? 'accepted' : null, ga4Env: GA4_ID, legacyEnv: GA_ADS_ID, path: pathname })

  // The page view is sent by hand, with the safe address, for the first page and for every page change.
  // A moment after the change: Next sets the new page title a little after the address changes, and a fast second change cancels the first.
  useEffect(() => {
    if (!ok) return
    const timer = setTimeout(() => sendGooglePageView(window, 'accepted'), 250)
    return () => clearTimeout(timer)
  }, [ok, pathname])

  // The Meta pixel: not on a page that opens private data; its own page changes are sent here, not by the pixel.
  useEffect(() => {
    if (!ok || !META_PIXEL) return
    if (metaFirstPage.current) { metaFirstPage.current = false; return }
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq
    if (fbq && !isSecretPath(pathname)) fbq('track', 'PageView')
  }, [ok, pathname])

  if (!ok) return null

  return (
    <>
      {META_PIXEL && !isSecretPath(pathname) && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState=true;fbq('init','${META_PIXEL}');fbq('track','PageView');`}
        </Script>
      )}

      {google.loaderId && (
        <>
          <Script src={googleTagLoaderUrl(google.loaderId)} strategy="afterInteractive" />
          <Script id="google-tag" strategy="afterInteractive">
            {googleTagBootstrapScript(google.configIds, safePage())}
          </Script>
        </>
      )}
    </>
  )
}
