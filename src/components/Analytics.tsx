'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { getConsent, CONSENT_EVENT } from './CookieConsent'

// Marketing tags for Facebook/Meta Ads (Pixel) and Google Ads/Analytics (gtag).
// They ONLY load once the visitor has accepted cookies AND the relevant ID is
// configured via env vars — so nothing runs until you're ready and it's
// consent-compliant. To enable, set on Vercel:
//   NEXT_PUBLIC_META_PIXEL_ID       (e.g. 1234567890)
//   NEXT_PUBLIC_GA_MEASUREMENT_ID   (GA4 "G-XXXX" or Google Ads "AW-XXXX")
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function Analytics() {
  const [ok, setOk] = useState(false)

  useEffect(() => {
    setOk(getConsent() === 'accepted')
    const onConsent = (e: Event) => setOk((e as CustomEvent).detail === 'accepted')
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [])

  if (!ok) return null

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

      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="google-tag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
    </>
  )
}
