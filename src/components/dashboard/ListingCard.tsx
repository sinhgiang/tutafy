'use client'

// "Your listing in the tutor directory" (T-0769, design: docs/directory-design/listing-not.html and listing-yes.html). The words and the answer
// come from the server (src/lib/listing-status.ts, which asks the same rule as the directory); this file draws them and shows the next free
// time in the viewer's own time zone.
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Check, Eye, EyeOff, Info, Minus } from 'lucide-react'
import { formatClock, dayLabel, safeZone, zoneCity } from '@/lib/tutor-profile'
import type { ListingCardData, ListingRow } from '@/lib/listing-status'

const subscribe = () => () => {}
const browserZone = (): string | null => {
  try { return safeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) } catch { return null }
}

const TICK: Record<ListingRow['state'], string> = { ok: 'bg-emerald-600', todo: 'bg-amber-500', optional: 'bg-gray-300' }

/** The card as HTML, with no browser state: what the server and the tests render. `zone` is the zone to read the next free time in; null = the tutor's own. */
export function ListingCardView({ card, zone, now }: { card: ListingCardData; zone: string | null; now: Date }) {
  const tz = zone ?? card.tz
  const nextText = card.nextFree
    ? `${dayLabel(Date.parse(card.nextFree), tz, now)} ${formatClock(Date.parse(card.nextFree), tz)} (${zone ? 'your time' : `${zoneCity(card.tz)} time`})`
    : null
  return (
    <section aria-labelledby="listing-title" data-testid="listing-card" data-listed={card.listed ? 'yes' : 'no'} data-waiting={card.waitingForDirectory ? 'yes' : 'no'}
      className={`bg-white rounded-2xl border ${card.listed ? 'border-emerald-100' : 'border-amber-200'} mb-4 overflow-hidden`}>
      <div className="px-4 sm:px-[22px] pt-5 pb-3 flex flex-wrap items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h2 id="listing-title" className="text-[16px] font-extrabold text-gray-900">{card.title}</h2>
          <p className="text-[13.5px] text-gray-600 mt-0.5 max-w-[520px]">{card.text}</p>
        </div>
        <span data-testid="listing-status" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13.5px] font-bold ${card.listed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          {card.listed ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
          {card.waitingForDirectory ? 'Ready' : card.listed ? 'Listed' : 'Not listed yet'}
        </span>
      </div>
      <ul className="px-4 sm:px-[22px] pb-2">
        {card.rows.map(r => (
          <li key={r.id} data-row={r.id} data-state={r.state} className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2 items-center py-3 border-t border-gray-100">
            <span className={`w-6 h-6 rounded-full grid place-items-center text-white ${TICK[r.state]}`} aria-hidden="true">
              {r.state === 'ok' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Minus className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <div className="min-w-0">
              <b className="block text-[14.5px] text-gray-900">{r.title}<span className="sr-only">{r.state === 'ok' ? ' (done)' : r.state === 'todo' ? ' (to do)' : ''}</span></b>
              <span className="block text-[13px] text-gray-600 break-words">{r.id === 'times' && r.state === 'ok' && nextText ? `Next free time: ${nextText}` : r.sub}</span>
            </div>
            {r.href && r.action && (
              <Link href={r.href} className="col-start-2 sm:col-start-auto inline-flex items-center justify-center min-h-11 px-4 text-[13px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl justify-self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1">
                {r.action}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className="bg-gray-50 border-t border-gray-100 px-4 sm:px-[22px] py-3 text-[13px] text-gray-700 flex gap-2.5 items-center">
        <Info className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        {card.listed && !card.waitingForDirectory
          ? <span>See your card: <Link href="/tutors" className="text-indigo-700 font-semibold underline underline-offset-2">View in the directory</Link></span>
          : card.waitingForDirectory
            ? <span>The directory is not open to students yet. Your booking link works now for the students you send there.</span>
            : <span>The directory only lists tutors a student can book. Your booking link still works for the students you send there.</span>}
      </div>
    </section>
  )
}

export function ListingCard({ card }: { card: ListingCardData }) {
  const zone = useSyncExternalStore(subscribe, browserZone, () => null)
  return <ListingCardView card={card} zone={zone} now={new Date()} />
}
