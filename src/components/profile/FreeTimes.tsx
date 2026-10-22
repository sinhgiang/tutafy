'use client'

// The free times on a tutor's public profile, shown in the VISITOR's time zone (T-0765). The server hands over real instants
// (src/lib/tutor-profile.ts: nextFreeSlots); the browser formats them. Until the browser's own zone is known (and on the server)
// the times are shown in the TUTOR's zone with that zone named, so the first paint is never in a wrong, unnamed zone.
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Clock, Globe, ArrowRight, CalendarX } from 'lucide-react'
import { groupSlots, nextLabel, zoneCity, safeZone, type FreeSlot } from '@/lib/tutor-profile'

/** 'ok': times follow; 'none': the tutor has hours but nothing is free soon; 'unknown': the times could not be worked out. */
export type TimesState = 'ok' | 'none' | 'unknown'

const subscribe = () => () => {}
const browserZone = (): string | null => {
  try {
    return safeZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    return null
  }
}

/** The visitor's own zone, or null on the server and in the first client render (so both agree). */
function useViewerZone(): string | null {
  return useSyncExternalStore(subscribe, browserZone, () => null)
}

type Common = { slots: FreeSlot[]; state: TimesState; tutorTz: string; bookHref: string; first: string }

function ZoneLine({ viewerTz, tutorTz }: { viewerTz: string | null; tutorTz: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-gray-500">
      <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {viewerTz ? `Times shown in your time zone: ${zoneCity(viewerTz)}` : `Times shown in ${zoneCity(tutorTz)} time`}
    </p>
  )
}

const chip = 'inline-flex items-center justify-center min-h-10 px-3 rounded-[10px] border text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 transition-colors'
const chipFirst = `${chip} border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100`
const chipPlain = `${chip} border-gray-200 bg-white text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50`

/** The "Next free times" block of the booking card: up to three times from the first day the visitor has any. */
export function NextTimes({ slots, state, tutorTz, bookHref, first }: Common) {
  const viewer = useViewerZone()
  const tz = viewer ?? safeZone(tutorTz)
  const now = new Date()
  const days = groupSlots(slots, tz, now, 1, 3)
  return (
    <div className="mt-4" data-testid="next-times">
      <p className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 mb-2"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> Next free times</p>
      {state === 'ok' && days.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            {days[0].times.map((t, i) => (
              <Link key={t.at} href={bookHref} data-testid="next-time" className={i === 0 ? chipFirst : chipPlain}>{days[0].label} {t.text}</Link>
            ))}
          </div>
          <div className="mt-2"><ZoneLine viewerTz={viewer} tutorTz={tutorTz} /></div>
        </>
      ) : state === 'none' ? (
        <p className="text-[13px] text-gray-600">{first} has no free times in the next 14 days. Check back soon.</p>
      ) : (
        <p className="text-[13px] text-gray-600">Open the booking page to see {first}&apos;s free times.</p>
      )}
    </div>
  )
}

/** The "When X is free" section: the next few days, each with its times, on the visitor's own calendar. */
export function FreeTimesSection({ slots, state, tutorTz, bookHref, first }: Common) {
  const viewer = useViewerZone()
  const tz = viewer ?? safeZone(tutorTz)
  const days = groupSlots(slots, tz, new Date(), 4, 6)
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6" aria-labelledby="free-times-title" data-testid="free-times">
      <h2 id="free-times-title" className="text-[18px] font-bold text-gray-900">When {first} is free</h2>
      {state === 'ok' && days.length > 0 ? (
        <>
          <div className="mt-1"><ZoneLine viewerTz={viewer} tutorTz={tutorTz} /></div>
          <div className="mt-4 space-y-4">
            {days.map((d, di) => (
              <div key={d.key}>
                <p className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">{d.label} <span className="font-normal normal-case text-gray-500">{d.date}</span></p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {d.times.map((t, i) => (
                    <Link key={t.at} href={bookHref} className={di === 0 && i === 0 ? chipFirst : chipPlain}>{t.text}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Link href={bookHref} className="mt-5 inline-flex items-center justify-center h-10 px-4 text-[13px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1">See all times</Link>
        </>
      ) : state === 'none' ? (
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-gray-50 p-4">
          <CalendarX className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[14px] font-semibold text-gray-900">No free times in the next 14 days</p>
            <p className="text-[13px] text-gray-600 mt-0.5">{first} may add more soon. The booking page always shows the latest.</p>
            <Link href={bookHref} className="mt-3 inline-flex items-center h-10 px-4 text-[13px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Open the booking page</Link>
          </div>
        </div>
      ) : (
        <Link href={bookHref} className="mt-4 inline-flex items-center justify-center h-10 px-4 text-[13px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1">See all times</Link>
      )}
    </section>
  )
}

/**
 * The booking bar that stays at the bottom of a phone screen: the price and the next free time beside the book button. Hidden from
 * the large breakpoint up, where the booking card is already in view at the side.
 */
export function StickyBookBar({ slots, state, tutorTz, bookHref, priceText, buttonText }: Omit<Common, 'first'> & { priceText: string | null; buttonText: string }) {
  const viewer = useViewerZone()
  const tz = viewer ?? safeZone(tutorTz)
  const label = state === 'ok' ? nextLabel(slots[0], tz, new Date()) : null
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(17,24,39,0.06)] pb-[env(safe-area-inset-bottom)]" data-testid="sticky-book-bar">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
        <div className="min-w-0 flex-1 leading-tight">
          {priceText && <p className="text-[14px] font-bold text-gray-900">{priceText}</p>}
          <p className="text-[12px] text-gray-600">{label ? `Next free time: ${label}` : 'See free times'}{label && !viewer ? ` (${zoneCity(tutorTz)})` : ''}</p>
        </div>
        <Link href={bookHref} className="shrink-0 inline-flex items-center justify-center gap-1.5 h-11 px-5 text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          {buttonText} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
