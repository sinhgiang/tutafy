'use client'

// The "Established" badge beside a tutor's name (T-0915, design A). Pressing it opens a small card under the name that lists what Tutafy checked, each with
// its date, and says plainly what the badge is not: Tutafy checks no ID, diploma or qualification. The card is a disclosure (a button with aria-expanded),
// in the flow of the page, so it never covers anything and works at 390 px without positioning tricks; Escape closes it and puts the focus back.
// Nothing here says or hints that a tutor was "verified".
import { useId, useRef, useState } from 'react'
import { Award, Check, ChevronDown } from 'lucide-react'
import { ESTABLISHED_NOTE, ESTABLISHED_TITLE, type EstablishedCheck } from '@/lib/established'

export function EstablishedName({ name, checks }: { name: string; checks: EstablishedCheck[] }) {
  const [open, setOpen] = useState(false)
  const panel = useId()
  const button = useRef<HTMLButtonElement>(null)
  return (
    <div onKeyDown={e => { if (e.key === 'Escape' && open) { setOpen(false); button.current?.focus() } }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[28px] sm:text-[32px] leading-tight font-extrabold text-gray-900 tracking-tight break-words">{name}</h1>
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={panel}
          data-testid="established-badge"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[13px] font-bold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <Award className="h-4 w-4" aria-hidden="true" /> Established
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="sr-only">: what this means</span>
        </button>
      </div>
      <div id={panel} hidden={!open} data-testid="established-card" className="mt-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm" role="region" aria-label={ESTABLISHED_TITLE}>
        <p className="flex items-center gap-2 text-[14px] font-bold text-gray-900"><Award className="h-4 w-4 text-emerald-800" aria-hidden="true" /> {ESTABLISHED_TITLE}</p>
        <ul className="mt-3 space-y-3">
          {checks.map(c => (
            <li key={c.id} className="flex items-start gap-2.5" data-testid={`established-${c.id}`}>
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" aria-hidden="true" />
              <div>
                <p className="text-[13.5px] font-semibold text-gray-900">{c.title}</p>
                <p className="text-[12.5px] text-gray-600">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-gray-100 pt-3 text-[12.5px] leading-relaxed text-gray-600">{ESTABLISHED_NOTE}</p>
      </div>
    </div>
  )
}

/** The badge as a plain label (no card), for the directory card, where the whole card is a link and a button cannot sit inside it. */
export function EstablishedChip({ className = '' }: { className?: string }) {
  return (
    <span data-testid="established-chip" className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-bold text-emerald-800 ${className}`}>
      <Award className="h-3.5 w-3.5" aria-hidden="true" /> Established
    </span>
  )
}
