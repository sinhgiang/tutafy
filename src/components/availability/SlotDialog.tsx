'use client'

// The form for one weekly slot (T-0844), shown over the Availability page: a new slot proposed by a press on the grid or a day name, or an
// existing slot to change or remove. It is a native <dialog> opened with showModal(), so Esc closes it, Tab stays inside it and focus goes
// back to where it was. The overlap rule is checked here before saving (the page checks it again).
import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { DAYS, checkEditedSlot, checkNewSlot, timeChoices, type NewSlot, type Slot } from '@/lib/availability-grid'

export type SlotForm = { mode: 'new'; slot: NewSlot } | { mode: 'edit'; slot: Slot }

type Props = {
  form: SlotForm
  slots: Slot[]
  busy: boolean
  onSave: (next: NewSlot, id: string | null) => void
  onRemove: (id: string) => void
  onClose: () => void
}

export function SlotDialog({ form, slots, busy, onSave, onRemove, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [day, setDay] = useState(String(form.slot.day_of_week))
  const [start, setStart] = useState(form.slot.start_time.slice(0, 5))
  const [end, setEnd] = useState(form.slot.end_time.slice(0, 5))
  const [problem, setProblem] = useState('')
  const id = form.mode === 'edit' ? form.slot.id : null

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  function save() {
    const next = { day_of_week: parseInt(day), start_time: start, end_time: end }
    const why = id ? checkEditedSlot(slots, id, next) : checkNewSlot(slots, next)
    if (why) { setProblem(why); return }
    setProblem('')
    onSave(next, id)
  }

  const starts = timeChoices([start])
  const ends = timeChoices([end], true)
  return (
    <dialog
      ref={ref}
      aria-labelledby="slot-dialog-title"
      data-testid="slot-dialog"
      className="av-dialog"
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) ref.current?.close() }}
    >
      <div className="av-dialog-box">
        <h2 id="slot-dialog-title">{id ? 'Change this slot' : 'Add a weekly slot'}</h2>
        <p>{id ? 'Students can book you inside these hours, every week.' : 'Pick the day and the hours students can book you, every week.'}</p>
        <div className="set-fields">
          <label>Day<select className="dash-select" value={day} onChange={e => setDay(e.target.value)}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
          <label>From<select className="dash-select" value={start} onChange={e => setStart(e.target.value)}>{starts.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>To<select className="dash-select" value={end} onChange={e => setEnd(e.target.value)}>{ends.map(t => <option key={t}>{t}</option>)}</select></label>
        </div>
        {problem && <p role="alert" data-testid="slot-dialog-problem" className="av-dialog-problem">{problem}</p>}
        <div className="av-dialog-actions">
          {id && <button type="button" className="dash-btn is-ghost" onClick={() => onRemove(id)} disabled={busy}><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button>}
          <span style={{ flex: 1 }} />
          <button type="button" className="dash-btn" onClick={() => ref.current?.close()}>Cancel</button>
          <button type="button" className="dash-btn is-primary" onClick={save} disabled={busy}>{id ? 'Save changes' : 'Add slot'}</button>
        </div>
      </div>
    </dialog>
  )
}
