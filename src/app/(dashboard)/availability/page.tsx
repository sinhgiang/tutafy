'use client'

// Availability (T-0824, T-0844): your week as a grid (seven day columns, hours down the side) you press and drag on to add, change and
// remove free hours, with the slot form and a "copy a day" tool beside it, and the blocked dates under it. Every write is the signed-in
// tutor's own (tutor_id from the session, and in the same statement for a change or a removal; row level security is the second lock,
// tested in tests/settings-forms.test.ts and tests/availability-grid.test.ts).
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Ban, CalendarClock, Copy, Plus, Trash2 } from 'lucide-react'
import { DAYS, checkEditedSlot, checkNewSlot, copyPlan, weeklyHours, type NewSlot, type Slot } from '@/lib/availability-grid'
import { WeekGrid, type GridOpen } from '@/components/availability/WeekGrid'
import { SlotDialog } from '@/components/availability/SlotDialog'

const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`)
interface Exception { id: string; date: string; reason: string | null }

export default function AvailabilityPage() {
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [newDay, setNewDay] = useState('1')
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('17:00')
  const [saving, setSaving] = useState(false)
  const [copyFrom, setCopyFrom] = useState('1')
  const [copyTo, setCopyTo] = useState<number[]>([2, 3, 4, 5])
  const [newExDate, setNewExDate] = useState('')
  const [newExReason, setNewExReason] = useState('')
  const [savingEx, setSavingEx] = useState(false)
  // the slot form over the page (a new slot proposed by a press, or a slot to change)
  const [dialog, setDialog] = useState<GridOpen | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [s, e] = await Promise.all([
      supabase.from('availability').select('*').eq('tutor_id', user.id).order('day_of_week'),
      supabase.from('availability_exceptions').select('*').eq('tutor_id', user.id).gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(30),
    ])
    if (s.error || e.error) setFailed(true)
    setSlots((s.data ?? []) as Slot[])
    setExceptions((e.data ?? []) as Exception[])
    setLoading(false)
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- load once on arrival; the state is set when the answer comes back

  const sorted = (list: Slot[]) => [...list].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))

  /** Adds one slot for the signed-in tutor; true when it was saved. The overlap rule is checked here for every way in (form, grid, dialog). */
  async function createSlot(add: NewSlot): Promise<boolean> {
    const problem = checkNewSlot(slots, add)
    if (problem) { toast.error(problem); return false }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      const { data, error } = await supabase.from('availability').insert({ tutor_id: user.id, ...add }).select().single()
      if (error) { toast.error(error.message); return false }
      setSlots(prev => sorted([...prev, data as Slot]))
      toast.success('Slot added')
      return true
    } finally { setSaving(false) }
  }

  async function addSlot() {
    await createSlot({ day_of_week: parseInt(newDay), start_time: newStart, end_time: newEnd })
  }

  /** Changes a slot's day or times. The tutor id is in the same statement, so a slot that is not this tutor's matches nothing. */
  async function updateSlot(id: string, next: NewSlot): Promise<boolean> {
    const problem = checkEditedSlot(slots, id, next)
    if (problem) { toast.error(problem); return false }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      const { data, error } = await supabase.from('availability').update(next).eq('id', id).eq('tutor_id', user.id).select()
      if (error || !data || data.length === 0) { toast.error('We could not change that slot. Reload the page and try again.'); return false }
      setSlots(prev => sorted(prev.map(s => (s.id === id ? { ...s, ...(data[0] as Slot) } : s))))
      toast.success('Slot changed')
      return true
    } finally { setSaving(false) }
  }

  async function saveFromDialog(next: NewSlot, id: string | null) {
    const ok = id ? await updateSlot(id, next) : await createSlot(next)
    if (ok) setDialog(null)
  }

  async function copyDay() {
    const plan = copyPlan(slots, parseInt(copyFrom), copyTo)
    if (plan.length === 0) { toast.error(`Nothing to copy: ${DAYS[parseInt(copyFrom)]} has no slots, or the other days already have them`); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data, error } = await supabase.from('availability').insert(plan.map(p => ({ tutor_id: user.id, ...p }))).select()
    if (error) { toast.error(error.message); setSaving(false); return }
    setSlots(prev => sorted([...prev, ...((data ?? []) as Slot[])]))
    toast.success(`Copied ${plan.length} slot${plan.length === 1 ? '' : 's'}`)
    setSaving(false)
  }

  async function deleteSlot(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('availability').delete().eq('id', id).eq('tutor_id', user.id).select('id')
    if (error || !data || data.length === 0) { toast.error('We could not remove that slot. Reload the page and try again.'); return }
    setSlots(prev => prev.filter(s => s.id !== id))
    setDialog(null)
    toast.success('Removed')
  }

  async function addException() {
    if (!newExDate) { toast.error('Select a date'); return }
    setSavingEx(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingEx(false); return }
    const { data, error } = await supabase.from('availability_exceptions').upsert({ tutor_id: user.id, date: newExDate, reason: newExReason.trim() || null }, { onConflict: 'tutor_id,date' }).select().single()
    if (error) { toast.error(error.message); setSavingEx(false); return }
    setExceptions(prev => [...prev.filter(e => e.date !== newExDate), data as Exception].sort((a, b) => a.date.localeCompare(b.date)))
    setNewExDate(''); setNewExReason('')
    toast.success('Date blocked')
    setSavingEx(false)
  }

  async function deleteException(id: string) {
    const { error } = await supabase.from('availability_exceptions').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setExceptions(prev => prev.filter(e => e.id !== id))
    toast.success('Unblocked')
  }

  const today = new Date().toISOString().split('T')[0]
  const total = weeklyHours(slots)

  if (loading) return <div role="status" className="dash-sk" style={{ height: 320 }}><span className="sr-only">Loading your availability</span></div>

  return (
    <div>
      <div className="dash-head">
        <div>
          <h1>Availability</h1>
          <p>{slots.length === 0 ? 'Set the hours students can book you.' : `${total % 1 === 0 ? total : total.toFixed(1)} hours a week. Block single dates for holidays.`}</p>
        </div>
      </div>
      {dialog && (
        <SlotDialog
          key={dialog.mode === 'edit' ? dialog.slot.id : `new-${dialog.slot.day_of_week}-${dialog.slot.start_time}`}
          form={dialog}
          slots={slots}
          busy={saving}
          onSave={(next, id) => { void saveFromDialog(next, id) }}
          onRemove={id => { void deleteSlot(id) }}
          onClose={() => setDialog(null)}
        />
      )}
      {failed && <div className="dash-card dash-card-b" role="alert" data-testid="availability-error" style={{ marginBottom: 16, color: 'var(--d-err)', background: 'var(--d-err-soft)' }}>We could not load all of your availability. What you see may be incomplete: reload the page before changing anything.</div>}

      <div className="set-two">
        <section className="dash-card" aria-label="Your week" data-testid="week-availability">
          {slots.length === 0 && (
            <div className="av-empty" data-testid="availability-empty">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
              <div><b>No hours yet.</b> Drag on a day below to draw your first free hours, press a day name, or use the form on the right. Students can only book inside the hours you set.</div>
            </div>
          )}
          <WeekGrid
            slots={slots}
            busy={saving}
            onDraw={add => { void createSlot(add) }}
            onOpen={setDialog}
            onResize={(id, next) => { void updateSlot(id, next) }}
            onRemove={id => { void deleteSlot(id) }}
            onProblem={message => toast.error(message)}
          />
        </section>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className="dash-card dash-card-b" aria-labelledby="add-h">
            <h2 id="add-h" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 650, color: 'var(--d-ink)' }}>Add a weekly slot</h2>
            <div className="set-fields">
              <label>Day<select className="dash-select" value={newDay} onChange={e => setNewDay(e.target.value)}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
              <label>From<select className="dash-select" value={newStart} onChange={e => setNewStart(e.target.value)}>{TIMES.map(t => <option key={t}>{t}</option>)}</select></label>
              <label>To<select className="dash-select" value={newEnd} onChange={e => setNewEnd(e.target.value)}>{TIMES.map(t => <option key={t}>{t}</option>)}</select></label>
            </div>
            <button type="button" className="dash-btn is-primary" style={{ marginTop: 12 }} onClick={addSlot} disabled={saving}><Plus className="h-4 w-4" aria-hidden="true" /> Add slot</button>
          </section>

          <section className="dash-card dash-card-b" aria-labelledby="copy-h">
            <h2 id="copy-h" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 650, color: 'var(--d-ink)' }}>Copy a day</h2>
            <label className="set-fields" style={{ display: 'grid' }}>Copy the slots of<select className="dash-select" value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
            <fieldset style={{ border: 0, padding: 0, margin: '12px 0 0' }}>
              <legend style={{ fontSize: 13, color: 'var(--d-ink-3)', marginBottom: 6 }}>to these days</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                {DAYS.map((d, i) => (
                  <label key={d} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--d-ink)' }}>
                    <input type="checkbox" className="dash-check" checked={copyTo.includes(i)} disabled={String(i) === copyFrom}
                      onChange={() => setCopyTo(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])} />{d.slice(0, 3)}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="dash-btn" style={{ marginTop: 12 }} onClick={copyDay} disabled={saving}><Copy className="h-4 w-4" aria-hidden="true" /> Copy</button>
          </section>
        </div>
      </div>

      <section className="dash-card" style={{ marginTop: 16 }} aria-labelledby="block-h">
        <div className="dash-card-h"><h2 id="block-h">Block specific dates</h2><span>vacation, sick days, holidays</span></div>
        <div className="dash-card-b">
          <div className="set-fields" style={{ alignItems: 'end' }}>
            <label>Date<input type="date" className="dash-input" style={{ maxWidth: 'none' }} value={newExDate} min={today} onChange={e => setNewExDate(e.target.value)} /></label>
            <label>Reason (optional)<input type="text" className="dash-input" style={{ maxWidth: 'none' }} value={newExReason} onChange={e => setNewExReason(e.target.value)} placeholder="Public holiday" maxLength={120} /></label>
            <button type="button" className="dash-btn" onClick={addException} disabled={savingEx || !newExDate}><Ban className="h-4 w-4" aria-hidden="true" /> Block date</button>
          </div>
          {exceptions.length === 0 ? (
            <p style={{ margin: '12px 0 0', color: 'var(--d-ink-3)' }}>No dates blocked. Students can book on all your available days.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8 }}>
              {exceptions.map(ex => (
                <li key={ex.id} className="dash-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--d-err-soft)' }}>
                  <Ban className="h-4 w-4" aria-hidden="true" style={{ color: 'var(--d-err)' }} />
                  <span style={{ flex: 1, color: 'var(--d-ink)' }}>
                    <b style={{ fontWeight: 650 }}>{new Date(ex.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>
                    {ex.reason && <span style={{ display: 'block', color: 'var(--d-ink-3)', fontSize: 13 }}>{ex.reason}</span>}
                  </span>
                  <button type="button" className="dash-icon-btn" onClick={() => deleteException(ex.id)} aria-label={`Unblock ${ex.date}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
