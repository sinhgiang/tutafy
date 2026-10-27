'use client'

// The Calendar (T-0823): a week view by default (a time grid, lessons you can drag to a new time), a month view, and under
// 768px a day-by-day list. Moving a lesson asks POST /api/lessons/reschedule; if the new time overlaps another lesson the
// server answers 409 and this view shows which, and moves it only when the tutor says "Move anyway". Dragging needs a mouse,
// so every lesson also has a "Move to" form (keyboard, phone). Dates are read in the browser's own time zone, as before.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import {
  GRID_FROM_HOUR, GRID_TO_HOUR, HOUR_PX, VIEWS, addDays, blockOf, dayKey, dropTarget, minutesAtOffset, onDay, openingMinute, parseDay, rangeFor, shift, weekDays, type CalView,
} from '@/lib/calendar'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STATUS_CLASS: Record<string, string> = { scheduled: 'is-scheduled', completed: 'is-completed', cancelled: 'is-cancelled', no_show: 'is-noshow' }

export type CalLesson = { id: string; starts_at: string; duration_minutes: number; status: string; price?: number | null; students?: { name?: string } | { name?: string }[] | null }
const nameOf = (l: CalLesson) => (Array.isArray(l.students) ? l.students[0]?.name : l.students?.name) ?? 'Lesson'
const timeOf = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const toLocalInput = (d: Date) => `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

type Pending = { lesson: CalLesson; target: Date; conflicts: { id: string; starts_at: string; duration_minutes: number; student: string }[] }

export default function CalendarView({ view, anchor, lessons, currency = 'USD' }: { view: CalView; anchor: string; lessons: CalLesson[]; currency?: string }) {
  const router = useRouter()
  const today = new Date()
  const anchorDay = parseDay(anchor, today)
  const days = weekDays(anchorDay)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [moveTo, setMoveTo] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const selected = lessons.find(l => l.id === selectedId) ?? null

  // Open the week grid at the first lesson (or now) instead of 6 AM; only when the grid is on screen (a phone shows a day list).
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const grid = gridRef.current
    const body = grid?.querySelector<HTMLElement>('.cal-week-body')
    if (view !== 'week' || !grid || !body || grid.offsetParent === null) return
    body.scrollTop = (openingMinute(lessons, weekDays(parseDay(anchor, new Date())), new Date()) / 60) * HOUR_PX
    // Only when the week or view changes: a lesson moved on this page must not scroll the grid away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor])

  const href = (v: CalView, d: Date) => `/calendar?view=${v}&date=${dayKey(d)}`
  const title = view === 'week'
    ? `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `${MONTHS[anchorDay.getMonth()]} ${anchorDay.getFullYear()}`

  async function move(lesson: CalLesson, target: Date, force: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/lessons/reschedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lesson_id: lesson.id, starts_at: target.toISOString(), force }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Moved to ${target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeOf(target)}`)
        setPending(null); setSelectedId(null)
        router.refresh()
      } else if (res.status === 409 && data.error === 'overlap') setPending({ lesson, target, conflicts: data.conflicts ?? [] })
      else toast.error(data.error ?? 'Could not move the lesson')
    } finally { setBusy(false) }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>, day: Date) {
    e.preventDefault()
    const lesson = lessons.find(l => l.id === dragId)
    setDragId(null)
    if (!lesson) return
    const rect = e.currentTarget.getBoundingClientRect()
    const minutes = minutesAtOffset(e.clientY - rect.top, lesson.duration_minutes)
    void move(lesson, dropTarget(day, minutes), false)
  }

  const detail = selected && (
    <section className="dash-card" aria-label="Selected lesson" data-testid="lesson-detail" style={{ marginTop: 16 }}>
      <div className="dash-card-h">
        <h2>{nameOf(selected)}</h2>
        <Link href={`/lessons/${selected.id}`} className="dash-btn">Open lesson</Link>
      </div>
      <div className="dash-card-b">
        <p style={{ margin: 0, color: 'var(--d-ink-3)' }}>
          {new Date(selected.starts_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, {timeOf(new Date(selected.starts_at))} for {selected.duration_minutes} minutes
          {selected.price ? `, ${formatMoney(Number(selected.price), currency)}` : ''}. <span className={`dash-chip ${selected.status === 'completed' ? 'is-ok' : selected.status === 'cancelled' ? 'is-err' : ''}`}>{selected.status.replace('_', ' ')}</span>
        </p>
        {selected.status === 'scheduled' && (
          <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}
            onSubmit={e => { e.preventDefault(); const t = new Date(moveTo || toLocalInput(new Date(selected.starts_at))); if (!Number.isNaN(t.getTime())) void move(selected, t, false) }}>
            <label htmlFor="move-to" style={{ fontWeight: 600 }}>Move to</label>
            <input id="move-to" type="datetime-local" className="dash-input" style={{ flex: '0 1 240px' }} value={moveTo || toLocalInput(new Date(selected.starts_at))} onChange={e => setMoveTo(e.target.value)} />
            <button type="submit" className="dash-btn is-primary" disabled={busy}>Move</button>
          </form>
        )}
      </div>
    </section>
  )

  const warning = pending && (
    <div className="dash-bulk" role="alertdialog" aria-label="Overlapping lesson" data-testid="overlap-warning" style={{ borderRadius: 12, border: '1px solid var(--d-brand-line)', marginBottom: 16, color: 'var(--d-ink)', background: 'var(--d-warn-soft)' }}>
      <span style={{ color: 'var(--d-warn)' }}>
        That time overlaps {pending.conflicts.map(c => `${c.student} at ${timeOf(new Date(c.starts_at))}`).join(', ') || 'another lesson'}.
      </span>
      <button type="button" className="dash-btn is-primary" disabled={busy} onClick={() => move(pending.lesson, pending.target, true)}>Move anyway</button>
      <button type="button" className="dash-btn" onClick={() => setPending(null)}>Keep the old time</button>
    </div>
  )

  return (
    <div>
      <div className="dash-head">
        <div><h1>Calendar</h1><p>{title}</p></div>
        <div className="dash-head-actions">
          <nav className="dash-seg" aria-label="View">
            {VIEWS.map(v => <Link key={v} href={href(v, anchorDay)} aria-current={v === view ? 'true' : undefined} style={{ textTransform: 'capitalize' }}>{v}</Link>)}
          </nav>
          <Link href={href(view, shift(view, anchorDay, -1))} className="dash-btn" aria-label={view === 'week' ? 'Previous week' : 'Previous month'}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href={href(view, today)} className="dash-btn">Today</Link>
          <Link href={href(view, shift(view, anchorDay, 1))} className="dash-btn" aria-label={view === 'week' ? 'Next week' : 'Next month'}><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
          <Link href="/lessons/new" className="dash-btn is-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Schedule lesson</Link>
        </div>
      </div>
      {warning}

      {view === 'week' ? (
        <>
          <div ref={gridRef} className="cal-week dash-card" data-testid="week-grid" role="grid" aria-label="Week">
            <div className="cal-week-head" role="row">
              <div />
              {days.map(d => (
                <div key={dayKey(d)} className={dayKey(d) === dayKey(today) ? 'is-today' : ''} role="columnheader">
                  <span>{DAYS[d.getDay()]}</span><b>{d.getDate()}</b>
                </div>
              ))}
            </div>
            <div className="cal-week-body">
              <div className="cal-gutter" aria-hidden="true">
                {Array.from({ length: GRID_TO_HOUR - GRID_FROM_HOUR }, (_, i) => <div key={i} style={{ height: HOUR_PX }}>{new Date(2000, 0, 1, GRID_FROM_HOUR + i).toLocaleTimeString('en-US', { hour: 'numeric' })}</div>)}
              </div>
              {days.map(d => (
                <div key={dayKey(d)} className="cal-col" role="gridcell" style={{ height: (GRID_TO_HOUR - GRID_FROM_HOUR) * HOUR_PX }} data-day={dayKey(d)}
                  onDragOver={e => { if (dragId) e.preventDefault() }} onDrop={e => onDrop(e, d)}>
                  {onDay(lessons, d).map(l => {
                    const s = new Date(l.starts_at)
                    const b = blockOf(s, l.duration_minutes)
                    const movable = l.status === 'scheduled'
                    return (
                      <button key={l.id} type="button" className={`cal-block ${STATUS_CLASS[l.status] ?? ''} ${l.id === selectedId ? 'is-selected' : ''}`} style={{ top: b.top, height: b.height }}
                        draggable={movable} onDragStart={e => { setDragId(l.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', l.id) }} onDragEnd={() => setDragId(null)}
                        onClick={() => { setSelectedId(l.id === selectedId ? null : l.id); setMoveTo('') }}
                        aria-label={`${nameOf(l)}, ${timeOf(s)}, ${l.duration_minutes} minutes, ${l.status.replace('_', ' ')}`}>
                        <b>{nameOf(l)}</b><span>{timeOf(s)}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="cal-agenda" data-testid="day-list">
            {days.map(d => {
              const ls = onDay(lessons, d)
              return (
                <section key={dayKey(d)} className="dash-card" style={{ marginBottom: 12 }}>
                  <div className="dash-card-h"><h2>{d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h2>{dayKey(d) === dayKey(today) && <span>Today</span>}</div>
                  {ls.length === 0 ? <p className="dash-card-b" style={{ color: 'var(--d-ink-3)' }}>No lessons</p> : (
                    <ul className="dash-rank" style={{ paddingTop: 8 }}>
                      {ls.map(l => <li key={l.id}><button type="button" className="cal-agenda-row" onClick={() => { setSelectedId(l.id); setMoveTo('') }}>
                        <span className={`cal-dot ${STATUS_CLASS[l.status] ?? ''}`} aria-hidden="true" />
                        <span><b>{nameOf(l)}</b><small>{timeOf(new Date(l.starts_at))}, {l.duration_minutes} min, {l.status.replace('_', ' ')}</small></span>
                      </button></li>)}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </>
      ) : (
        <MonthGrid anchor={anchorDay} today={today} lessons={lessons} selectedId={selectedId} onSelect={id => { setSelectedId(id); setMoveTo('') }} />
      )}
      {detail}
      <div className="dash-legend">
        {['scheduled', 'completed', 'cancelled'].map(k => <span key={k}><i className={`cal-dot ${STATUS_CLASS[k]}`} aria-hidden="true" /> {k[0].toUpperCase() + k.slice(1)}</span>)}
        {view === 'week' && <span className="cal-hint">Drag a scheduled lesson to move it, or open it and use Move to.</span>}
      </div>
    </div>
  )
}

function MonthGrid({ anchor, today, lessons, selectedId, onSelect }: { anchor: Date; today: Date; lessons: CalLesson[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const { from } = rangeFor('month', anchor)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(from, i))
  return (
    <div className="dash-card" data-testid="month-grid">
      <div className="cal-month-head">{DAYS.map(d => <div key={d}>{d}</div>)}</div>
      <div className="cal-month">
        {cells.map(d => {
          const ls = onDay(lessons, d)
          const outside = d.getMonth() !== anchor.getMonth()
          return (
            <div key={dayKey(d)} className={`cal-cell ${outside ? 'is-outside' : ''}`}>
              <span className={dayKey(d) === dayKey(today) ? 'cal-today' : ''}>{d.getDate()}</span>
              {ls.slice(0, 3).map(l => (
                <button key={l.id} type="button" className={`cal-chip ${STATUS_CLASS[l.status] ?? ''} ${l.id === selectedId ? 'is-selected' : ''}`} onClick={() => onSelect(l.id)}
                  aria-label={`${nameOf(l)}, ${timeOf(new Date(l.starts_at))}`}>{nameOf(l).split(' ')[0]}</button>
              ))}
              {ls.length > 3 && <small>+{ls.length - 3} more</small>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
