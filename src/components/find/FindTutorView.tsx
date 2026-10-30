'use client'

// "Find me a tutor" as the visitor uses it (T-0897, design option A of T-0864): one screen, the questions on the left, the three tutors that fit on
// the right (under the form on a phone, where the button stays in reach). The answers are the directory's own filters (src/lib/directory.ts) and the
// tutors are the directory's public cards, so nothing here can show a tutor the directory would not. The form is a plain GET form that works without
// scripts (the server draws the answer for the address); with scripts the three tutors follow every answer, and the address is kept for sharing.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CalendarX, Check, Clock, Globe, SearchX, Star } from 'lucide-react'
import { initialsOf, priceLabel, safeZone, zoneCity } from '@/lib/tutor-profile'
import {
  DIRECTORY_OPENS_AT, GROUP_OPTIONS, LEVEL_OPTIONS, PRICE_BUCKETS, TOD_OPTIONS, ZONE_CHOICES, filterLabel, filtersToQuery, languageCounts, nextAvailableText, withoutFilter,
  type DirectoryCard, type Filters,
} from '@/lib/directory'
import { SUGGESTED, findTutors, formFilters, whyThisTutor } from '@/lib/find-tutor'

const subscribe = () => () => {}
const browserZone = (): string | null => {
  try { return safeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) } catch { return null }
}

/** Languages drawn as buttons; the rest sit behind "More…". */
const TOP_LANGUAGES = 5

const TILES = [['#E0E7FF', '#4338CA'], ['#FCE7F3', '#BE185D'], ['#DCFCE7', '#15803D'], ['#FEF3C7', '#B45309'], ['#EDE9FE', '#6D28D9'], ['#CCFBF1', '#0F766E']] as const
const tileFor = (name: string) => TILES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TILES.length]

const RING = 'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2'
const PRIMARY = 'inline-flex items-center justify-center gap-2 min-h-12 px-5 text-[15px] font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const SECONDARY = 'inline-flex items-center justify-center gap-2 min-h-11 px-4 text-[14px] font-bold rounded-xl text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

/** One answer: a real radio button, drawn as a pill. The button itself is hidden but stays in the tab order, and the pill shows its focus and its choice. */
function Choice({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="relative">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={`inline-flex items-center min-h-11 px-4 rounded-full border text-[14px] font-semibold cursor-pointer select-none bg-white text-gray-800 border-gray-300 hover:border-indigo-300 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 peer-checked:text-white ${RING}`}>
        {children}
      </span>
    </label>
  )
}

function Question({ legend, note, children }: { legend: string; note?: string; children: ReactNode }) {
  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="text-[13px] font-bold text-gray-700 mb-2">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {note && <p className="mt-1.5 text-[12.5px] text-gray-600">{note}</p>}
    </fieldset>
  )
}

function Pick({ card, rank, filters, zone, now }: { card: DirectoryCard; rank: number; filters: Filters; zone: string | null; now: Date }) {
  const [bg, fg] = tileFor(card.name)
  const price = priceLabel(card.price, card.currency)
  const why = whyThisTutor(card, filters, { zone, now })
  return (
    <article className="bg-white border border-gray-100 rounded-[18px] shadow-sm p-4 min-[721px]:p-5" data-testid="find-pick" data-slug={card.slug}>
      <div className="flex items-start gap-3">
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a tutor's photo can be any web address the tutor pasted; this is one 48px picture
          <img src={card.photo} alt="" width={48} height={48} loading="lazy" className="w-12 h-12 rounded-xl object-cover shrink-0 bg-indigo-100" />
        ) : (
          <span aria-hidden="true" data-testid="card-monogram" style={{ background: bg, color: fg }} className="w-12 h-12 rounded-xl grid place-items-center font-extrabold text-[17px] shrink-0">{initialsOf(card.name)}</span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-extrabold text-gray-900 leading-tight break-words"><Link href={`/tutors/${card.slug}`} className="hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">{card.name}</Link></h3>
          <p className="mt-0.5 text-[13px] text-gray-600 flex flex-wrap items-center gap-x-1.5">
            {card.rating !== null && <span className="inline-flex items-center gap-1 font-bold text-gray-900"><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" aria-hidden="true" /><span className="sr-only">Rated </span>{card.rating.toFixed(1)} <span className="font-medium text-gray-600">({card.reviews})</span></span>}
            {card.rating !== null && <span aria-hidden="true">·</span>}
            <span>{card.languages.join(' · ')}</span>
          </p>
        </div>
        <span className="shrink-0 text-[12px] font-bold text-indigo-700 bg-indigo-50 rounded-full px-2.5 py-1"><span className="sr-only">Match </span>#{rank}</span>
      </div>
      <h4 className="mt-3.5 text-[12px] font-bold tracking-wide uppercase text-gray-600">Why this tutor</h4>
      <ul className="mt-1.5 grid gap-1 text-[14px] text-gray-800" data-testid="find-why">
        {why.map(w => <li key={w} className="flex gap-2 items-start"><Check className="h-4 w-4 text-emerald-600 mt-[3px] shrink-0" aria-hidden="true" /><span>{w}</span></li>)}
      </ul>
      <div className="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-800 rounded-xl px-3 py-2 text-[13px]" data-testid="find-next">
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0"><b className="font-bold">Next available</b> · <span>{nextAvailableText(card, zone ?? card.tz, now)}</span><small className="block text-[12px] leading-tight text-emerald-900/80">{zone ? 'Your time' : `${zoneCity(card.tz)} time`}</small></div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="leading-tight">
          {price ? <><small className="block text-[12px] text-gray-600">From</small><b className="text-[22px] font-extrabold text-gray-900">{price}<span className="text-[13px] font-medium text-gray-600"> / lesson</span></b></> : <b className="text-[14px] font-semibold text-gray-700">Ask for price</b>}
        </div>
        <Link href={`/book/${card.slug}`} className="inline-flex items-center justify-center min-h-11 px-5 text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          Book<span className="sr-only"> a lesson with {card.name}</span>
        </Link>
      </div>
    </article>
  )
}

export function FindTutorView({ cards, initial, nowIso, error, listed }: { cards: DirectoryCard[]; initial: Filters; nowIso: string; error: boolean; listed: number }) {
  const [filters, setFilters] = useState<Filters>(() => formFilters(initial))
  const browser = useSyncExternalStore(subscribe, browserZone, () => null)
  const viewerZone = filters.tz ?? browser
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const resultsRef = useRef<HTMLElement>(null)

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    try { window.history.replaceState(null, '', `/find-a-tutor${filtersToQuery(filters)}`) } catch { /* the address is only for sharing */ }
  }, [filters])

  const set = (patch: Partial<Filters>) => setFilters(f => ({ ...f, ...patch }))
  const ctx = useMemo(() => ({ zone: viewerZone, now }), [viewerZone, now])
  const result = useMemo(() => findTutors(cards, filters, ctx), [cards, filters, ctx])
  const languages = useMemo(() => languageCounts(cards), [cards])
  const top = languages.slice(0, TOP_LANGUAGES)
  const more = languages.slice(TOP_LANGUAGES)
  const chosenInMore = filters.lang !== null && more.some(l => l.language.toLowerCase() === filters.lang!.toLowerCase())
  const open = !error && cards.length > 0
  // "What it is for" is asked only once some tutor who can be booked has said who they like to teach (the directory hides its filter the same way), or when the address already carries it
  const askGroup = filters.group !== null || cards.some(c => c.groups.length > 0)
  const same = (a: string | null, b: string) => a !== null && a.toLowerCase() === b.toLowerCase()
  const tzLine = filters.tz ? `Times shown in: ${zoneCity(filters.tz)}` : viewerZone ? `Times shown in your time zone: ${zoneCity(viewerZone)}` : 'Times shown in each tutor’s own time zone, until we know yours'
  const zoneOptions = filters.tz && !(ZONE_CHOICES as readonly string[]).includes(filters.tz) ? [filters.tz, ...ZONE_CHOICES] : [...ZONE_CHOICES]
  const count = result.picks.length
  const active = (['lang', 'level', 'group', 'price', 'tod', 'trial'] as const).filter(k => (k === 'trial' ? filters.trial : Boolean(filters[k])))

  const show = (e: React.FormEvent) => {
    e.preventDefault()
    const el = resultsRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch { /* an old browser: the focus is enough */ }
  }

  return (
    <div className="max-w-[1120px] mx-auto px-4 pt-[18px] pb-10 min-[721px]:pt-7 min-[721px]:pb-12">
      <h1 className="text-[28px] min-[721px]:text-[34px] leading-[1.1] tracking-tight font-extrabold text-gray-900">Find me a language tutor</h1>
      <p className="text-[15px] min-[721px]:text-[16px] text-gray-700 mt-2 max-w-[680px]" data-testid="find-answer">
        Answer a few questions and we show you the 3 tutors who fit best. Every one of them has open times in the next 14 days, and you book with just your name and email.
      </p>

      {error && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-[14px] text-red-900" data-testid="find-error">
          <AlertCircle className="h-[18px] w-[18px] shrink-0 mt-0.5" aria-hidden="true" />
          <span><b>We could not load the tutors.</b> Check your connection and try again. <a href={`/find-a-tutor${filtersToQuery(filters)}`} className="font-bold underline underline-offset-2">Try again</a></span>
        </div>
      )}

      {!error && cards.length === 0 && (
        <div className="text-center px-4 py-14 max-w-[520px] mx-auto grid gap-2.5 justify-items-center" data-testid="find-closed">
          <span className="w-[72px] h-[72px] rounded-[22px] bg-indigo-50 text-indigo-600 grid place-items-center"><CalendarX className="h-8 w-8" aria-hidden="true" /></span>
          <h2 className="text-[22px] font-extrabold text-gray-900">The tutor finder opens soon</h2>
          <p className="text-[15px] text-gray-700">We only suggest tutors you can book today, and we open once at least {DIRECTORY_OPENS_AT} tutors have open times. {listed > 0 ? 'Tutors are finishing their profiles now, so check back soon.' : 'Check back soon.'}</p>
          <Link href="/tutors" className={SECONDARY}>See the tutor list</Link>
        </div>
      )}

      {open && (
        <div className="mt-6 grid gap-6 items-start min-[900px]:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <form method="get" action="/find-a-tutor" onSubmit={show} className="bg-white border border-gray-100 rounded-[20px] shadow-sm p-5 min-[721px]:p-6" data-testid="find-form">
            <h2 className="text-[20px] font-extrabold text-gray-900">Tell us what you need</h2>
            <p className="text-[14px] text-gray-600 mt-1">A few quick answers. No account, no email yet.</p>

            <Question legend="I want to learn">
              <Choice name="lang" value="" checked={filters.lang === null} onChange={() => set({ lang: null })}>Any language</Choice>
              {top.map(l => <Choice key={l.language} name="lang" value={l.language.toLowerCase()} checked={same(filters.lang, l.language)} onChange={() => set({ lang: l.language })}>{l.language}</Choice>)}
              {more.length > 0 && (
                <select name="lang" aria-label="More languages" value={chosenInMore ? filters.lang!.toLowerCase() : ''} onChange={e => set({ lang: e.target.value || null })}
                  className={`min-h-11 rounded-full border px-4 text-[14px] font-semibold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${chosenInMore ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-300'}`}>
                  <option value="">More…</option>
                  {more.map(l => <option key={l.language} value={l.language.toLowerCase()}>{l.language}</option>)}
                </select>
              )}
            </Question>

            <Question legend="My level" note="Not sure? Choose Beginner: tutors will find your level in the first lesson.">
              <Choice name="level" value="" checked={filters.level === null} onChange={() => set({ level: null })}>Any</Choice>
              {LEVEL_OPTIONS.map(o => <Choice key={o.id} name="level" value={o.id} checked={filters.level === o.id} onChange={() => set({ level: o.id })}>{o.label}</Choice>)}
            </Question>

            {askGroup && (
              <Question legend="What it is for">
                <Choice name="for" value="" checked={filters.group === null} onChange={() => set({ group: null })}>Any</Choice>
                {GROUP_OPTIONS.map(o => <Choice key={o.id} name="for" value={o.id} checked={filters.group === o.id} onChange={() => set({ group: o.id })}>{o.label}</Choice>)}
              </Question>
            )}

            <Question legend="Price per lesson">
              <Choice name="price" value="" checked={filters.price === null} onChange={() => set({ price: null })}>Any</Choice>
              {PRICE_BUCKETS.map(b => <Choice key={b.id} name="price" value={b.id} checked={filters.price === b.id} onChange={() => set({ price: b.id })}>{b.label}</Choice>)}
            </Question>

            <Question legend="When I can have lessons">
              <Choice name="tod" value="" checked={filters.tod === null} onChange={() => set({ tod: null })}>Any time</Choice>
              {TOD_OPTIONS.map(o => <Choice key={o.id} name="tod" value={o.id} checked={filters.tod === o.id} onChange={() => set({ tod: o.id })}>{o.label}</Choice>)}
            </Question>
            <p className="mt-2 text-[12.5px] text-gray-600 flex items-start gap-1.5" data-testid="find-tz"><Globe className="h-3.5 w-3.5 mt-[3px] shrink-0" aria-hidden="true" /><span>{tzLine}</span></p>
            <details className="mt-1 text-[13px]">
              <summary className="inline-flex items-center min-h-11 cursor-pointer font-semibold text-indigo-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">Change time zone</summary>
              <label htmlFor="find-tz" className="sr-only">Show times in</label>
              <select id="find-tz" name="tz" value={filters.tz ?? ''} onChange={e => set({ tz: e.target.value || null })} className="w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-[14px] text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                <option value="">{browser ? `Automatic: ${zoneCity(browser)}` : 'Automatic (your browser)'}</option>
                {zoneOptions.map(z => <option key={z} value={z}>{zoneCity(z)} ({z.split('/')[0].replace('_', ' ')})</option>)}
              </select>
            </details>

            <label className="relative mt-4 flex items-center justify-between gap-3.5 rounded-2xl border border-gray-200 px-3.5 py-3 cursor-pointer">
              <span><b className="block text-[14px] text-gray-900">Only tutors with a trial lesson</b><span className="text-[12.5px] text-gray-600">A 30-minute first lesson</span></span>
              <input type="checkbox" role="switch" name="trial" value="1" checked={filters.trial} onChange={e => set({ trial: e.target.checked })} className="peer sr-only" />
              <span aria-hidden="true" className={`w-11 h-[26px] rounded-full relative shrink-0 bg-gray-300 peer-checked:bg-indigo-600 ${RING} after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:left-[21px]`} />
            </label>

            <div className="mt-5 max-[899px]:sticky max-[899px]:bottom-0 max-[899px]:-mx-5 max-[899px]:px-5 max-[899px]:py-3 max-[899px]:bg-white max-[899px]:border-t max-[899px]:border-gray-100 max-[899px]:rounded-b-[20px]">
              <button type="submit" className={`${PRIMARY} w-full`} data-testid="find-submit">
                {count > 0 ? `Show my ${count === 1 ? '1 tutor' : `${count} tutors`}` : 'Show my tutors'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          <section ref={resultsRef} tabIndex={-1} aria-labelledby="find-results-h" className="focus:outline-none scroll-mt-4" data-testid="find-results">
            {count > 0 ? (
              <>
                <h2 id="find-results-h" className="text-[22px] font-extrabold text-gray-900" aria-live="polite" data-testid="find-count">{count === 1 ? '1 tutor' : `${count} tutors`} you can book today</h2>
                <p className="mt-1 text-[14px] text-gray-700">Picked from every tutor with open times in the next 14 days. <Link href={`/tutors${filtersToQuery(filters)}`} className="font-bold text-indigo-700 underline underline-offset-2" data-testid="find-all">See all tutors</Link></p>
                <div className="mt-4 grid gap-3.5" data-testid="find-picks">
                  {result.picks.map((c, i) => <Pick key={c.slug} card={c} rank={i + 1} filters={filters} zone={viewerZone} now={now} />)}
                </div>
                {count < SUGGESTED && result.relax.length > 0 && (
                  <p className="mt-4 text-[14px] text-gray-700" data-testid="find-relax">Only {count} {count === 1 ? 'tutor fits' : 'tutors fit'} all your answers. For more, try {result.relax.slice(0, 2).map((r, i) => (
                    <span key={r.key}>{i > 0 ? ' or ' : ''}<button type="button" onClick={() => setFilters(withoutFilter(filters, r.key))} className="font-bold text-indigo-700 underline underline-offset-2 p-1">removing {r.label} ({r.count} {r.count === 1 ? 'tutor' : 'tutors'})</button></span>
                  ))}.</p>
                )}
              </>
            ) : (
              <div className="bg-white border border-gray-100 rounded-[18px] shadow-sm text-center px-5 py-10 grid gap-2.5 justify-items-center" data-testid="find-nomatch">
                <span className="w-[72px] h-[72px] rounded-[22px] bg-indigo-50 text-indigo-600 grid place-items-center"><SearchX className="h-8 w-8" aria-hidden="true" /></span>
                <h2 id="find-results-h" className="text-[22px] font-extrabold text-gray-900" aria-live="polite">No tutor fits all your answers yet</h2>
                <p className="text-[15px] text-gray-700 max-w-[460px]">Nobody with open times fits {active.map(k => filterLabel({ ...filters, q: '' }, k)).join(' + ') || 'these answers'}.</p>
                {result.relax.length > 0 && (
                  <p className="text-[14px] text-gray-700">Try {result.relax.slice(0, 2).map((r, i) => (
                    <span key={r.key}>{i > 0 ? ' or ' : ''}<button type="button" onClick={() => setFilters(withoutFilter(filters, r.key))} className="font-bold text-indigo-700 underline underline-offset-2 p-1">removing {r.label} ({r.count} {r.count === 1 ? 'tutor' : 'tutors'})</button></span>
                  ))}.</p>
                )}
                <div className="flex flex-wrap gap-2.5 justify-center mt-1.5">
                  <button type="button" onClick={() => setFilters(f => formFilters({ ...f, lang: null, level: null, group: null, price: null, tod: null, trial: false }))} className={PRIMARY}>Start again</button>
                  <Link href="/tutors" className={SECONDARY}>See all tutors</Link>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
