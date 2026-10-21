'use client'

// "Get your first student" (T-0681): a checklist on the tutor dashboard. The ticks come from the
// server (src/lib/first-student.ts); this file only draws them, copies the booking link and hides the card.
import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Check, Copy, EyeOff, Rocket } from 'lucide-react'
import { readHidden, writeHidden, type FirstStudentCard as Card } from '@/lib/first-student'

const HIDE_EVENT = 'tutafy:first-student-hidden'

/** localStorage, or null when the browser refuses it (the getter itself can throw). */
function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(HIDE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(HIDE_EVENT, onChange)
  }
}

/** The card as HTML, with no browser state: what the server and the tests render. */
export function FirstStudentView({ card, onHide, onCopy, copied }: { card: Card; onHide?: () => void; onCopy?: () => void; copied?: boolean }) {
  return (
    <section aria-labelledby="first-student-title" data-testid="first-student-card" className="bg-white rounded-2xl border border-indigo-100 mb-4">
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0" aria-hidden="true">
            <Rocket className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h2 id="first-student-title" className="text-[16px] font-bold text-gray-900">Get your first student</h2>
            <p className="text-[13px] text-gray-500" data-testid="first-student-progress">{card.done} of {card.required} done</p>
          </div>
        </div>
        <button type="button" onClick={onHide} aria-label="Hide the Get your first student card"
          className="flex items-center gap-1 text-[12.5px] font-semibold text-gray-500 hover:text-gray-700 shrink-0">
          <EyeOff className="h-3.5 w-3.5" /> Hide
        </button>
      </div>
      <div className="mx-5 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(card.done / card.required) * 100}%` }} />
      </div>
      <ol className="px-5 pb-4 pt-2 divide-y divide-gray-50">
        {card.steps.map(s => (
          <li key={s.id} data-step={s.id} data-done={s.done ? 'true' : 'false'} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'border-2 border-gray-200'}`}>
                {s.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <div className="min-w-0">
                <p className={`text-[14px] font-semibold ${s.done ? 'text-gray-500' : 'text-gray-900'}`}>
                  <span className="sr-only">{s.done ? 'Done: ' : 'To do: '}</span>
                  {s.title}
                  {s.proOnly && <span className="ml-2 align-middle text-[11px] font-bold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">Pro</span>}
                </p>
                <p className="text-[13px] text-gray-500">{s.hint}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0 pl-8 sm:pl-0">
              {s.id === 'share' && card.bookingUrl && (
                <button type="button" onClick={onCopy} data-testid="copy-booking-link"
                  className="flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              )}
              <Link href={s.href} data-testid={`go-${s.id}`}
                className={`flex items-center h-9 px-3 text-[13px] font-semibold rounded-lg ${s.done ? 'text-gray-600 bg-gray-50 hover:bg-gray-100' : 'text-white bg-indigo-500 hover:bg-indigo-600'}`}>
                {s.action}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function FirstStudentCard({ card, tutorId }: { card: Card; tutorId: string }) {
  // Until the browser's own flag is read (and on the server) the card is hidden, so a tutor who hid it never sees it flash.
  const hidden = useSyncExternalStore(
    subscribe,
    () => readHidden(browserStorage(), tutorId),
    () => true,
  )
  const [copied, setCopied] = useState(false)
  if (hidden) return null
  return (
    <FirstStudentView
      card={card}
      copied={copied}
      onHide={() => {
        writeHidden(browserStorage(), tutorId)
        window.dispatchEvent(new Event(HIDE_EVENT))
      }}
      onCopy={() => {
        if (!card.bookingUrl) return
        navigator.clipboard.writeText(card.bookingUrl).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => { /* clipboard blocked: the link is also on the booking page itself */ })
      }}
    />
  )
}

