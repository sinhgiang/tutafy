'use client'

// The tutor directory as the visitor uses it (T-0769, design: docs/directory-design). The server hands over the tutors the rule listed
// (src/lib/directory.ts: only tutors with a free time in the next 14 days) and this file does the rest in the browser: search, language,
// price, free times in the VISITOR's time zone, trial lesson, sort, "show more". The filters live in the address (?lang=...&price=...), so a
// filtered list can be shared. Until the visitor's own time zone is known (the server's draw) the day and time-of-day filters are left out
// and each card shows its time in the tutor's own zone, named.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  Search, SlidersHorizontal, ChevronDown, Languages, Wallet, CalendarClock, Zap, X, Globe, Sprout, SearchX, CalendarX, AlertCircle, GraduationCap, Check, Lightbulb, Signal,
} from 'lucide-react'
import { safeZone, zoneCity } from '@/lib/tutor-profile'
import {
  APPROX_RATES_NOTE, DIRECTORY_OPENS_AT, FEW_TUTORS_BELOW, NEAR_HOURS, PAGE_SIZE, PRICE_BUCKETS, SORT_OPTIONS, TOD_OPTIONS, WHEN_OPTIONS, ZONE_CHOICES,
  activeFilters, applyFilters, clearedFilters, filterLabel, filtersToQuery, languageCounts, levelCounts, relaxations, sortCards, stateOf, withoutFilter,
  type DirectoryCard, type Filters, type SortId,
} from '@/lib/directory'
import { TutorCard } from '@/components/directory/TutorCard'

const subscribe = () => () => {}
const browserZone = (): string | null => {
  try { return safeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) } catch { return null }
}

type Panel = 'lang' | 'level' | 'price' | 'time' | 'zone' | 'sheet' | null

const BTN = 'inline-flex items-center justify-center gap-2 min-h-11 px-5 text-[14px] font-bold rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const PRIMARY = `${BTN} text-white bg-indigo-600 hover:bg-indigo-700`
const SECONDARY = `${BTN} text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50`
const PILL = 'inline-flex items-center gap-2 min-h-11 px-3.5 rounded-full border text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
const pillClass = (on: boolean) => `${PILL} shrink-0 ${on ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-300'}`
const OPT = 'inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-full border text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
const optClass = (on: boolean) => `${OPT} ${on ? 'bg-indigo-600 border-indigo-600 text-white font-semibold' : 'bg-white border-gray-300 text-gray-800 font-medium hover:border-indigo-300'}`

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={optClass(on)}>{children}</button>
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="[&+&]:mt-4">
      <h3 className="text-[13px] font-bold text-gray-700 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
      {note && <p className="mt-1.5 text-[12.5px] text-gray-600">{note}</p>}
    </div>
  )
}

function LanguageGroup({ languages, filters, set }: { languages: { language: string; count: number }[]; filters: Filters; set: (f: Filters) => void }) {
  return (
    <Group title="Language" note="Only languages with a tutor who can be booked are listed.">
      <Option on={!filters.lang} onClick={() => set({ ...filters, lang: null })}>Any</Option>
      {languages.map(l => (
        <Option key={l.language} on={filters.lang?.toLowerCase() === l.language.toLowerCase()} onClick={() => set({ ...filters, lang: l.language })}>
          {l.language} <span className="text-[12.5px] opacity-80">{l.count}</span>
        </Option>
      ))}
    </Group>
  )
}

function LevelGroup({ levels, filters, set }: { levels: ReturnType<typeof levelCounts>; filters: Filters; set: (f: Filters) => void }) {
  return (
    <Group title="Student level" note="Only levels that a tutor who can be booked has chosen are listed. A tutor who has not chosen a level is not matched.">
      <Option on={!filters.level} onClick={() => set({ ...filters, level: null })}>Any</Option>
      {levels.map(l => (
        <Option key={l.level} on={filters.level === l.level} onClick={() => set({ ...filters, level: l.level })}>
          {l.label} <span className="text-[12.5px] opacity-80">{l.hint} · {l.count}</span>
        </Option>
      ))}
    </Group>
  )
}

/** The zone the visitor reads times in (kept in the address as ?tz=) and the "near me" filter, which compares each tutor's clock with that zone. */
function ZoneGroup({ filters, set, browser }: { filters: Filters; set: (f: Filters) => void; browser: string | null }) {
  const options = filters.tz && !(ZONE_CHOICES as readonly string[]).includes(filters.tz) ? [filters.tz, ...ZONE_CHOICES] : [...ZONE_CHOICES]
  return (
    <>
      <div className="[&+&]:mt-4">
        <label htmlFor="dir-zone" className="block text-[13px] font-bold text-gray-700 mb-2">Show times in</label>
        <select id="dir-zone" value={filters.tz ?? ''} onChange={e => set({ ...filters, tz: e.target.value || null })}
          className="w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-[14px] text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
          <option value="">{browser ? `Automatic: ${zoneCity(browser)}` : 'Automatic (your browser)'}</option>
          {options.map(z => <option key={z} value={z}>{zoneCity(z)} ({z.split('/')[0].replace('_', ' ')})</option>)}
        </select>
        <p className="mt-1.5 text-[12.5px] text-gray-600">Free times, the Day and Time of day filters and each card follow this zone. It is saved in the page address.</p>
      </div>
      <Group title="Tutor's clock" note={`Tutors whose local time is within ${NEAR_HOURS} hours of yours, so a lesson does not land in the middle of their night.`}>
        <Option on={filters.near} onClick={() => set({ ...filters, near: !filters.near })}>{filters.near && <Check className="h-4 w-4" aria-hidden="true" />} Within {NEAR_HOURS} hours of me</Option>
      </Group>
    </>
  )
}

function PriceGroup({ filters, set }: { filters: Filters; set: (f: Filters) => void }) {
  return (
    <Group title="Price per lesson" note={APPROX_RATES_NOTE}>
      <Option on={!filters.price} onClick={() => set({ ...filters, price: null })}>Any</Option>
      {PRICE_BUCKETS.map(b => <Option key={b.id} on={filters.price === b.id} onClick={() => set({ ...filters, price: b.id })}>{b.label}</Option>)}
    </Group>
  )
}

function TimeGroups({ filters, set, zoneKnown }: { filters: Filters; set: (f: Filters) => void; zoneKnown: boolean }) {
  return (
    <>
      <Group title="Day (next 14 days)" note={zoneKnown ? undefined : 'Day and time filters start working as soon as we know your time zone.'}>
        <Option on={!filters.when} onClick={() => set({ ...filters, when: null })}>Any day</Option>
        {WHEN_OPTIONS.map(o => <Option key={o.id} on={filters.when === o.id} onClick={() => set({ ...filters, when: o.id })}>{o.label}</Option>)}
      </Group>
      <Group title="Time of day (your time)">
        <Option on={!filters.tod} onClick={() => set({ ...filters, tod: null })}>Any time</Option>
        {TOD_OPTIONS.map(o => (
          <Option key={o.id} on={filters.tod === o.id} onClick={() => set({ ...filters, tod: o.id })}>{o.label} <span className="text-[12.5px] opacity-80">{o.hint}</span></Option>
        ))}
      </Group>
    </>
  )
}

/** A dialog that closes on Escape or a click outside, keeps Tab inside, and gives the focus back to the button that opened it. */
function Dialog({ label, onClose, children, sheet }: { label: string; onClose: () => void; children: React.ReactNode; sheet?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, select')
    first?.focus()
    // a popover (not the sheet) also closes on a press anywhere outside it and its button
    const outside = (e: MouseEvent) => {
      const box = ref.current?.parentElement
      if (!sheet && box && !box.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', outside)
    return () => { document.removeEventListener('mousedown', outside); opener?.focus?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when the dialog opens
  }, [])
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
    if (e.key !== 'Tab' || !ref.current) return
    const items = [...ref.current.querySelectorAll<HTMLElement>('button, [href], input, select')].filter(x => !x.hasAttribute('disabled'))
    if (items.length === 0) return
    const a = items[0], z = items[items.length - 1]
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
  }
  const body = (
    <div ref={ref} role="dialog" aria-modal={sheet ? 'true' : undefined} aria-label={label} onKeyDown={onKey}
      className={sheet
        ? 'bg-white w-full max-w-[560px] max-h-[calc(100vh-32px)] max-[720px]:max-h-[86vh] overflow-auto rounded-[20px] max-[720px]:rounded-b-none px-[22px] pt-5 pb-0 shadow-2xl'
        : 'absolute z-20 left-0 right-0 sm:right-auto sm:w-[340px] mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-[18px]'}>
      {children}
    </div>
  )
  if (!sheet) return body
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/45 grid place-items-center max-[720px]:items-end p-4 max-[720px]:p-0" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      {body}
    </div>
  )
}

export function DirectoryView({ cards, listed, truncated, initial, nowIso, error }: {
  cards: DirectoryCard[]; listed: number; truncated: boolean; initial: Filters; nowIso: string; error: boolean
}) {
  const [filters, setFilters] = useState<Filters>(initial)
  const [panel, setPanel] = useState<Panel>(null)
  const [shown, setShown] = useState(PAGE_SIZE)
  const browser = useSyncExternalStore(subscribe, browserZone, () => null)
  // the zone chosen in the address wins over the browser's, and it is known on the server too, so a shared link draws the same days and hours there
  const viewerZone = filters.tz ?? browser
  const now = useMemo(() => new Date(nowIso), [nowIso])

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    try { window.history.replaceState(null, '', `/tutors${filtersToQuery(filters)}`) } catch { /* the address is only for sharing */ }
  }, [filters])

  const set = (f: Filters) => { setFilters(f); setShown(PAGE_SIZE) }
  const ctx = { zone: viewerZone, now }
  const state = stateOf(cards.length)
  const matching = useMemo(() => sortCards(applyFilters(cards, filters, ctx), filters.sort, now), [cards, filters, viewerZone, now]) // eslint-disable-line react-hooks/exhaustive-deps -- ctx is built from viewerZone and now
  const languages = useMemo(() => languageCounts(cards), [cards])
  const levels = useMemo(() => levelCounts(cards), [cards])
  const showLevels = levels.length > 0 || Boolean(filters.level)
  const active = activeFilters(filters)
  const relax = useMemo(() => (matching.length < FEW_TUTORS_BELOW && active.length > 0 ? relaxations(cards, filters, ctx) : []), [cards, filters, matching.length, viewerZone, now]) // eslint-disable-line react-hooks/exhaustive-deps -- ctx is built from viewerZone and now
  const rows = matching.slice(0, shown)
  const near = matching.length > 0 ? relax[0] : undefined
  const zoneKnown = viewerZone !== null
  const filterCount = active.filter(k => k !== 'q').length + (filters.tz ? 1 : 0)

  const tzLine = filters.tz ? `Times shown in: ${zoneCity(filters.tz)}` : viewerZone ? `Times shown in your time zone: ${zoneCity(viewerZone)}` : 'Times shown in each tutor’s own time zone, until we know yours'

  return (
    <div className="max-w-[1120px] mx-auto px-4 pt-[18px] pb-10 min-[721px]:pt-7 min-[721px]:pb-12">
      <div>
        <h1 className="text-[28px] min-[721px]:text-[34px] leading-[1.1] tracking-tight font-extrabold text-gray-900">Find a language tutor you can book today</h1>
        <p className="text-[15px] min-[721px]:text-[16px] text-gray-600 mt-2 max-w-[640px]">Every tutor here has open times in the next 14 days. Book with just your name and email.</p>
        <p className="inline-flex items-center gap-1.5 text-[13px] text-gray-600 mt-2.5" data-testid="tz-line"><Globe className="h-3.5 w-3.5" aria-hidden="true" /> {tzLine}
          <button type="button" onClick={() => setPanel(window.matchMedia('(min-width: 721px)').matches ? 'zone' : 'sheet')} className="min-h-11 -my-3 px-1.5 font-semibold text-indigo-700 underline underline-offset-2" data-testid="tz-change">Change</button></p>
      </div>

      {error && (
        <>
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-[14px] text-red-900" data-testid="directory-error">
            <AlertCircle className="h-[18px] w-[18px] shrink-0 mt-0.5" aria-hidden="true" />
            <span><b>We could not load the tutors.</b> Check your connection and try again. Your filters are kept. <a href={`/tutors${filtersToQuery(filters)}`} className="font-bold underline underline-offset-2">Try again</a></span>
          </div>
        </>
      )}

      {!error && state === 'empty' && (
        <div className="text-center px-4 py-14 max-w-[520px] mx-auto grid gap-2.5 justify-items-center" data-testid="directory-empty">
          <span className="w-[72px] h-[72px] rounded-[22px] bg-indigo-50 text-indigo-600 grid place-items-center"><CalendarX className="h-8 w-8" aria-hidden="true" /></span>
          <h2 className="text-[22px] font-extrabold text-gray-900">The tutor directory opens soon</h2>
          <p className="text-[15px] text-gray-600">We only list tutors you can book today, and we open the directory once at least {DIRECTORY_OPENS_AT} tutors are ready. Tutors are finishing their profiles now, so check back soon.</p>
          <p className="text-[15px] text-gray-600">If you teach, add your free hours and write a short introduction, and your card appears here as soon as the directory opens.</p>
          <div className="flex gap-2.5 flex-wrap justify-center mt-1.5">
            <Link href="/dashboard" className={PRIMARY}>Complete your profile</Link>
            <Link href="/register" className={SECONDARY}>Create your free page</Link>
          </div>
        </div>
      )}

      {!error && state !== 'empty' && (
        <>
          {state === 'few' && (
            <div className="mt-[22px] flex gap-3.5 items-start rounded-2xl border border-indigo-100 bg-indigo-50 px-[18px] py-4" data-testid="directory-few">
              <span className="w-[38px] h-[38px] rounded-xl bg-white text-indigo-600 grid place-items-center shrink-0"><Sprout className="h-5 w-5" aria-hidden="true" /></span>
              <div><b className="block text-[15px] text-gray-900">We are just getting started</b><p className="text-[14px] text-gray-700 mt-0.5">We only list tutors who have open times, so there {cards.length === 1 ? 'is 1 today' : `are ${cards.length} today`}. More join every week.</p></div>
            </div>
          )}

          <div className="mt-[22px] grid gap-3 relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-500 pointer-events-none" aria-hidden="true" />
              <input type="search" value={filters.q} onChange={e => set({ ...filters, q: e.target.value.slice(0, 60) })} placeholder="Search by name or language" aria-label="Search tutors" maxLength={60}
                className="w-full min-h-12 rounded-[14px] border border-gray-300 pl-11 pr-4 text-[15px] bg-white text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="flex gap-2 items-center max-[720px]:flex-nowrap max-[720px]:overflow-x-auto min-[721px]:flex-wrap" role="group" aria-label="Filters">
              <div className="hidden min-[721px]:contents">
                <div className="relative">
                  <button type="button" className={pillClass(Boolean(filters.lang))} aria-haspopup="dialog" aria-expanded={panel === 'lang'} onClick={() => setPanel(panel === 'lang' ? null : 'lang')}>
                    <Languages className="h-4 w-4 text-gray-500" aria-hidden="true" /> Language <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  </button>
                  {panel === 'lang' && <Dialog label="Language" onClose={() => setPanel(null)}><LanguageGroup languages={languages} filters={filters} set={set} /><Done count={matching.length} onClose={() => setPanel(null)} onClear={() => set(withoutFilter(filters, 'lang'))} /></Dialog>}
                </div>
                {showLevels && (
                  <div className="relative">
                    <button type="button" className={pillClass(Boolean(filters.level))} aria-haspopup="dialog" aria-expanded={panel === 'level'} onClick={() => setPanel(panel === 'level' ? null : 'level')}>
                      <Signal className="h-4 w-4 text-gray-500" aria-hidden="true" /> Level <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                    </button>
                    {panel === 'level' && <Dialog label="Student level" onClose={() => setPanel(null)}><LevelGroup levels={levels} filters={filters} set={set} /><Done count={matching.length} onClose={() => setPanel(null)} onClear={() => set(withoutFilter(filters, 'level'))} /></Dialog>}
                  </div>
                )}
                <div className="relative">
                  <button type="button" className={pillClass(Boolean(filters.price))} aria-haspopup="dialog" aria-expanded={panel === 'price'} onClick={() => setPanel(panel === 'price' ? null : 'price')}>
                    <Wallet className="h-4 w-4 text-gray-500" aria-hidden="true" /> Price <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  </button>
                  {panel === 'price' && <Dialog label="Price per lesson" onClose={() => setPanel(null)}><PriceGroup filters={filters} set={set} /><Done count={matching.length} onClose={() => setPanel(null)} onClear={() => set(withoutFilter(filters, 'price'))} /></Dialog>}
                </div>
                <div className="relative">
                  <button type="button" className={pillClass(Boolean(filters.when || filters.tod))} aria-haspopup="dialog" aria-expanded={panel === 'time'} onClick={() => setPanel(panel === 'time' ? null : 'time')}>
                    <CalendarClock className="h-4 w-4 text-gray-500" aria-hidden="true" /> Free times <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  </button>
                  {panel === 'time' && <Dialog label="Free times" onClose={() => setPanel(null)}><TimeGroups filters={filters} set={set} zoneKnown={zoneKnown} /><Done count={matching.length} onClose={() => setPanel(null)} onClear={() => set({ ...filters, when: null, tod: null })} /></Dialog>}
                </div>
                <div className="relative">
                  <button type="button" className={pillClass(Boolean(filters.tz || filters.near))} aria-haspopup="dialog" aria-expanded={panel === 'zone'} onClick={() => setPanel(panel === 'zone' ? null : 'zone')}>
                    <Globe className="h-4 w-4 text-gray-500" aria-hidden="true" /> Time zone <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  </button>
                  {panel === 'zone' && <Dialog label="Time zone" onClose={() => setPanel(null)}><ZoneGroup filters={filters} set={set} browser={browser} /><Done count={matching.length} onClose={() => setPanel(null)} onClear={() => set({ ...filters, tz: null, near: false })} /></Dialog>}
                </div>
                <button type="button" className={pillClass(filters.trial)} aria-pressed={filters.trial} onClick={() => set({ ...filters, trial: !filters.trial })}>
                  <Zap className="h-4 w-4 text-gray-500" aria-hidden="true" /> Trial lesson
                </button>
              </div>
              <button type="button" className={`${pillClass(filterCount > 0)} min-[721px]:hidden`} aria-haspopup="dialog" aria-expanded={panel === 'sheet'} onClick={() => setPanel('sheet')}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters {filterCount > 0 && <span className="bg-indigo-600 text-white rounded-full text-[11px] min-w-[18px] h-[18px] grid place-items-center px-[5px]">{filterCount}</span>}
              </button>
              <span className="flex-1 max-[720px]:hidden" />
              <label className={`${PILL} shrink-0 bg-white border-gray-300 text-gray-700 font-medium relative`}>
                <span className="sr-only">Sort tutors</span><span aria-hidden="true">Sort:</span>
                <select value={filters.sort} onChange={e => set({ ...filters, sort: e.target.value as SortId })} aria-label="Sort tutors"
                  className="bg-transparent font-semibold text-gray-900 focus:outline-none cursor-pointer min-h-11 -ml-1 pr-1">
                  {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
            </div>
            {active.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center" data-testid="applied-filters">
                {active.map(k => (
                  <span key={k} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full pl-3 pr-1.5 py-1 text-[13px] font-semibold">
                    {filterLabel(filters, k)}
                    <button type="button" aria-label={`Remove filter ${filterLabel(filters, k)}`} onClick={() => set(withoutFilter(filters, k))} className="w-7 h-7 grid place-items-center rounded-full hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </span>
                ))}
                <button type="button" onClick={() => set(clearedFilters(filters))} className="min-h-11 px-2 text-[13px] font-semibold text-gray-700 underline underline-offset-2">Clear all</button>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between gap-3 mt-[22px] mb-3 text-[14px] text-gray-700" aria-live="polite" data-testid="directory-count">
            <span><b className="text-[16px] text-gray-900">{matching.length} {matching.length === 1 ? 'tutor' : 'tutors'}</b>{active.length > 0 ? ` of ${cards.length}` : ''} with open times</span>
          </div>

          {matching.length === 0 ? (
            <div className="text-center px-4 py-12 max-w-[520px] mx-auto grid gap-2.5 justify-items-center" data-testid="directory-nomatch">
              <span className="w-[72px] h-[72px] rounded-[22px] bg-indigo-50 text-indigo-600 grid place-items-center"><SearchX className="h-8 w-8" aria-hidden="true" /></span>
              <h2 className="text-[22px] font-extrabold text-gray-900">No tutors match these filters</h2>
              <p className="text-[15px] text-gray-600">Nobody with open times fits {active.map(k => filterLabel(filters, k)).join(' + ')}.</p>
              {relax.length > 0 && (
                <p className="text-[14px] text-gray-700 mt-1">Try {relax.slice(0, 2).map((r, i) => (
                  <span key={r.key}>{i > 0 ? ' or ' : ''}<button type="button" onClick={() => set(withoutFilter(filters, r.key))} className="font-bold text-indigo-700 underline underline-offset-2 p-1">removing {r.label} ({r.count} {r.count === 1 ? 'tutor' : 'tutors'})</button></span>
                ))}.</p>
              )}
              <div className="mt-1.5"><button type="button" onClick={() => set(clearedFilters(filters))} className={PRIMARY}>Clear all filters</button></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3.5 min-[721px]:grid-cols-2 min-[721px]:gap-5 min-[1001px]:grid-cols-3" data-testid="directory-grid">
                {rows.map(c => <TutorCard key={c.slug} card={c} zone={viewerZone ?? c.tz} viewerZone={viewerZone} now={now} />)}
                {near && rows.length === matching.length && (
                  <aside className="border border-gray-200 bg-white rounded-[18px] p-6 flex flex-col gap-2.5 justify-center" data-testid="directory-near">
                    <span className="w-11 h-11 rounded-[14px] bg-indigo-50 text-indigo-600 grid place-items-center"><Lightbulb className="h-[22px] w-[22px]" aria-hidden="true" /></span>
                    <h2 className="text-[20px] font-extrabold text-gray-900 leading-tight">{near.count - matching.length} more {near.count - matching.length === 1 ? 'tutor' : 'tutors'} if you drop “{near.label}”</h2>
                    <p className="text-[14.5px] text-gray-700">They match everything else you picked.</p>
                    <p><button type="button" onClick={() => set(withoutFilter(filters, near.key))} className={SECONDARY}>Show them</button></p>
                  </aside>
                )}
                {state === 'few' && <Invite />}
              </div>
              {matching.length > rows.length && (
                <div className="grid justify-items-center mt-6 gap-2 text-[13px] text-gray-600">
                  <button type="button" onClick={() => setShown(shown + PAGE_SIZE)} className={SECONDARY}>Show more tutors</button>
                  <span>Showing {rows.length} of {matching.length}</span>
                </div>
              )}
              {truncated && rows.length === matching.length && <p className="text-center text-[13px] text-gray-600 mt-5" data-testid="directory-truncated">Showing the first {cards.length} of {listed} tutors. Use the filters to narrow the list.</p>}
            </>
          )}

          {state === 'many' && (
            <section className="mt-9 rounded-[20px] bg-gradient-to-br from-indigo-900 to-indigo-600 text-white px-5 py-5 min-[721px]:px-7 min-[721px]:py-[26px] flex flex-wrap items-center justify-between gap-4" data-testid="directory-band">
              <div><h2 className="text-[20px] font-extrabold">Are you a tutor?</h2><p className="text-indigo-100 mt-1 text-[14.5px]">Set your free hours, and students can book you here. Free to start, no commission.</p></div>
              <Link href="/register" className={`${BTN} bg-white text-indigo-700 hover:bg-indigo-50 max-[720px]:w-full`}>Create your free page</Link>
            </section>
          )}
        </>
      )}

      {panel === 'sheet' && (
        <Dialog label="Filters" sheet onClose={() => setPanel(null)}>
          <div className="flex justify-between items-center mb-3.5">
            <h2 className="text-[18px] font-extrabold text-gray-900">Filters</h2>
            <button type="button" aria-label="Close filters" onClick={() => setPanel(null)} className="w-11 h-11 rounded-full bg-gray-100 grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"><X className="h-[18px] w-[18px]" aria-hidden="true" /></button>
          </div>
          <LanguageGroup languages={languages} filters={filters} set={set} />
          {showLevels && <LevelGroup levels={levels} filters={filters} set={set} />}
          <PriceGroup filters={filters} set={set} />
          <TimeGroups filters={filters} set={set} zoneKnown={zoneKnown} />
          <div className="mt-4"><ZoneGroup filters={filters} set={set} browser={browser} /></div>
          <div className="mt-4 flex items-center justify-between gap-3.5 rounded-2xl border border-gray-200 px-3.5 py-3">
            <div><b className="block text-[14px] text-gray-900">Trial lesson offered</b><span className="text-[12.5px] text-gray-600">Tutors with a cheaper first lesson</span></div>
            <button type="button" role="switch" aria-checked={filters.trial} aria-label="Trial lesson offered" onClick={() => set({ ...filters, trial: !filters.trial })}
              className={`w-11 h-[26px] rounded-full relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${filters.trial ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all ${filters.trial ? 'left-[21px]' : 'left-[3px]'}`} />
            </button>
          </div>
          <div className="sticky bottom-0 bg-white pt-3 pb-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2.5">
            <button type="button" onClick={() => set(clearedFilters(filters))} className="min-h-11 px-2 text-[13px] font-semibold text-gray-700 underline underline-offset-2">Clear all</button>
            <button type="button" onClick={() => setPanel(null)} className={PRIMARY}>Show {matching.length} {matching.length === 1 ? 'tutor' : 'tutors'}</button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function Done({ count, onClose, onClear }: { count: number; onClose: () => void; onClear: () => void }) {
  return (
    <div className="flex justify-between items-center gap-2.5 mt-[18px]">
      <button type="button" onClick={onClear} className="min-h-11 px-2 text-[13px] font-semibold text-gray-700 underline underline-offset-2">Clear</button>
      <button type="button" onClick={onClose} className={PRIMARY}>Show {count} {count === 1 ? 'tutor' : 'tutors'}</button>
    </div>
  )
}

function Invite() {
  return (
    <aside className="border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-[18px] p-6 flex flex-col gap-2.5 justify-center" data-testid="directory-invite">
      <span className="w-11 h-11 rounded-[14px] bg-white text-indigo-600 grid place-items-center"><GraduationCap className="h-[22px] w-[22px]" aria-hidden="true" /></span>
      <h2 className="text-[20px] font-extrabold text-gray-900 leading-tight">Teach on Tutafy</h2>
      <p className="text-[14.5px] text-gray-700">Add your free hours and your page appears here.</p>
      <ul className="text-[14px] text-gray-700 grid gap-1">
        {['Free page and booking link', 'No commission, you keep 100%', 'Students book without an account'].map(t => (
          <li key={t} className="flex gap-2 items-start"><Check className="h-4 w-4 text-emerald-600 mt-[3px] shrink-0" aria-hidden="true" /><span>{t}</span></li>
        ))}
      </ul>
      <p className="mt-1.5"><Link href="/register" className={PRIMARY}>Create your free page</Link></p>
    </aside>
  )
}

