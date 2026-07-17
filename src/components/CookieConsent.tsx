'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const KEY = 'tutafy_cookie_consent'
export const CONSENT_EVENT = 'tutafy-consent'

export function getConsent(): 'accepted' | 'declined' | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(KEY)
  return v === 'accepted' || v === 'declined' ? v : null
}

// GDPR/CCPA-style consent banner. Marketing/analytics scripts (Meta Pixel,
// Google tag) only load AFTER the visitor accepts — see Analytics.tsx. This is
// what keeps ad accounts compliant when running a Pixel or conversion tag.
export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!getConsent()) setShow(true)
  }, [])

  function choose(choice: 'accepted' | 'declined') {
    localStorage.setItem(KEY, choice)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }))
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[60] bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-300/40 p-5">
      <p className="text-[13px] font-semibold text-gray-900 mb-1">We value your privacy 🍪</p>
      <p className="text-[12px] text-gray-500 leading-relaxed">
        We use cookies to run the site and, with your consent, to measure our marketing. See our{' '}
        <Link href="/privacy" className="text-indigo-500 hover:underline">Privacy Policy</Link>.
      </p>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={() => choose('accepted')}
          className="flex-1 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-lg py-2">
          Accept
        </button>
        <button onClick={() => choose('declined')}
          className="text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-colors px-4 py-2">
          Decline
        </button>
      </div>
    </div>
  )
}
