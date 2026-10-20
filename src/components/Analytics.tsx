'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { getConsent, CONSENT_EVENT } from './CookieConsent'
import { googleTagPlan, googleTagLoaderUrl, googleTagBootstrapScript } from '@/lib/google-tag'

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

export function Analytics() {
  const [ok, setOk] = useState(false)

  useEffect(() => {
    setOk(getConsent() === 'accepted')
    const onConsent = (e: Event) => setOk((e as CustomEvent).detail === 'accepted')
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])

  if (!ok) return null

  const google = googleTagPlan({ consent: 'accepted', ga4Env: GA4_ID, legacyEnv: GA_ADS_ID })

  return (
    <>
      {META_PIXEL && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');fbq('track','PageView');`}
        </Script>
      )}

      {google.loaderId && (
        <>
          <Script src={googleTagLoaderUrl(google.loaderId)} strategy="afterInteractive" />
          <Script id="google-tag" strategy="afterInteractive">
            {googleTagBootstrapScript(google.configIds)}
          </Script>
        </>
      )}
    </>
  )
}
