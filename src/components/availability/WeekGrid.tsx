'use client'

// The week grid of the Availability page (T-0844): seven day columns, hours down the side, and the free hours drawn as blocks.
//   - DRAG on empty space in a day (mouse or pen) draws a new slot from the half hour where you pressed to the half hour where you let go;
//   - PRESS (a click, or a tap on a phone) on empty space opens the slot form with an hour from that half hour, to confirm;
//   - PRESS a slot opens the same form to change its day or times, or remove it;
//   - DRAG the top or bottom edge of a slot (mouse or pen) to make it start earlier or end later;
//   - KEYBOARD: every day name is a button that opens the form for that day, and every slot is a button that opens it for that slot.
// The grid only says what the person meant; the page checks the overlap again and does the saving (it owns the signed-in tutor).
import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  DAYS, DRAG_THRESHOLD_PX, GRID_HOUR_PX, checkEditedSlot, checkNewSlot, dragToSlot, firstFreeSlot, gridRange, pressToSlot, resizeTo, slotBlock,
  type NewSlot, type Slot,
} from '@/lib/availability-grid'

export type GridOpen = { mode: 'new'; slot: NewSlot } | { mode: 'edit'; slot: Slot }

type Props = {
  slots: Slot[]
  busy: boolean
  /** A drag finished on free space: add this slot. */
  onDraw: (slot: NewSlot) => void
  /** A press: show the form for a new slot (proposed) or for an existing one. */
  onOpen: (target: GridOpen) => void
  /** An edge was dragged: this is the slot's new shape. */
  onResize: (id: string, next: NewSlot) => void
  onRemove: (id: string) => void
  /** Something the person tried that cannot be done (an overlap), in words. */
  onProblem: (message: string) => void
}

type Draft = { day: number; slot: NewSlot }
type Resizing = { id: string; next: NewSlot }

const short = (t: string) => t.slice(0, 5)

export function WeekGrid({ slots, busy, onDraw, onOpen, onResize, onRemove, onProblem }: Props) {
  const range = gridRange(slots)
  const hours = Array.from({ length: range.to - range.from }, (_, i) => range.from + i)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [resizing, setResizing] = useState<Resizing | null>(null)
  const dragging = useRef<{ day: number; y0: number; top: number } | null>(null)
  const justDragged = useRef(false)

  const yIn = (e: { clientY: number }, top: number) => e.clientY - top

  // ---- drawing a new slot on empty space ----
  function columnDown(e: React.PointerEvent<HTMLDivElement>, day: number) {
    if (busy || e.pointerType === 'touch' || e.button !== 0 || e.target !== e.currentTarget) return
    const top = e.currentTarget.getBoundingClientRect().top
    dragging.current = { day, y0: yIn(e, top), top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function columnMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragging.current
    if (!d) return
    const y = yIn(e, d.top)
    if (Math.abs(y - d.y0) < DRAG_THRESHOLD_PX) { setDraft(null); return }
    const slot = dragToSlot(d.day, d.y0, y, range)
    setDraft(slot ? { day: d.day, slot } : null)
  }
  function columnUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragging.current
    dragging.current = null
    setDraft(null)
    if (!d) return
    const y = yIn(e, d.top)
    if (Math.abs(y - d.y0) < DRAG_THRESHOLD_PX) return // a press: the click handler takes it
    justDragged.current = true
    setTimeout(() => { justDragged.current = false }, 0)
    const slot = dragToSlot(d.day, d.y0, y, range)
    if (!slot) return
    const problem = checkNewSlot(slots, slot)
    if (problem) onProblem(problem)
    else onDraw(slot)
  }
  function columnClick(e: React.MouseEvent<HTMLDivElement>, day: number) {
    if (busy || justDragged.current || e.target !== e.currentTarget) return
    const slot = pressToSlot(slots, day, e.nativeEvent.offsetY, range)
    if (slot) onOpen({ mode: 'new', slot })
    else onProblem(`There is no free half hour there on ${DAYS[day]}`)
  }

  // ---- changing the start or the end of a slot ----
  function edgeDown(e: React.PointerEvent<HTMLSpanElement>, slot: Slot, edge: 'start' | 'end') {
    if (busy || e.pointerType === 'touch' || e.button !== 0) return
    e.stopPropagation()
    const column = e.currentTarget.closest('.av-col') as HTMLElement
    const top = column.getBoundingClientRect().top
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => setResizing({ id: slot.id, next: resizeTo(slot, edge, ev.clientY - top, range) })
    const up = (ev: PointerEvent) => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', cancel)
      const next = resizeTo(slot, edge, ev.clientY - top, range)
      setResizing(null)
      justDragged.current = true
      setTimeout(() => { justDragged.current = false }, 0)
      const same = short(next.start_time) === short(slot.start_time) && short(next.end_time) === short(slot.end_time)
      if (same) return
      const problem = checkEditedSlot(slots, slot.id, next)
      if (problem) onProblem(problem)
      else onResize(slot.id, next)
    }
    const cancel = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', cancel)
      setResizing(null)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', cancel)
  }

  return (
    <div className="av-week">
      <div className="av-head">
        <div aria-hidden="true" />
        {DAYS.map((d, i) => (
          <div key={d}>
            <button
              type="button"
              className="av-day-btn"
              disabled={busy}
              aria-label={`Add a slot on ${d}`}
              onClick={() => {
                const slot = firstFreeSlot(slots, i, range)
                if (slot) onOpen({ mode: 'new', slot })
                else onProblem(`${d} has no free half hour left`)
              }}
            >
              {d.slice(0, 3)} <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <div className="av-body">
        <div className="av-gutter" aria-hidden="true">{hours.map(h => <div key={h} style={{ height: GRID_HOUR_PX }}>{new Date(2000, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric' })}</div>)}</div>
        {DAYS.map((d, i) => (
          <div
            key={d}
            className="av-col is-live"
            data-day={i}
            style={{ height: hours.length * GRID_HOUR_PX, backgroundSize: `100% ${GRID_HOUR_PX}px` }}
            onPointerDown={e => columnDown(e, i)}
            onPointerMove={columnMove}
            onPointerUp={columnUp}
            onPointerCancel={() => { dragging.current = null; setDraft(null) }}
            onClick={e => columnClick(e, i)}
          >
            {slots.filter(s => s.day_of_week === i).map(s => {
              const shown = resizing?.id === s.id ? { ...s, ...resizing.next } : s
              const b = slotBlock(shown, range.from)
              const label = `${d} ${short(s.start_time)} to ${short(s.end_time)}`
              return (
                <div key={s.id} className={`av-slot${resizing?.id === s.id ? ' is-resizing' : ''}`} data-testid="av-slot" style={{ top: b.top, height: b.height }}>
                  <span className="av-grip av-grip-start" aria-hidden="true" onPointerDown={e => edgeDown(e, s, 'start')} />
                  <button type="button" className="av-slot-main" onClick={() => { if (!justDragged.current) onOpen({ mode: 'edit', slot: s }) }} aria-label={`Change ${label}`}>
                    {short(shown.start_time)}–{short(shown.end_time)}
                  </button>
                  <button type="button" className="av-slot-x" onClick={() => onRemove(s.id)} aria-label={`Remove ${label}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  <span className="av-grip av-grip-end" aria-hidden="true" onPointerDown={e => edgeDown(e, s, 'end')} />
                </div>
              )
            })}
            {draft?.day === i && (() => {
              const b = slotBlock(draft.slot, range.from)
              return <div className="av-slot av-draft" aria-hidden="true" style={{ top: b.top, height: b.height }}><span>{draft.slot.start_time}–{draft.slot.end_time}</span></div>
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}
