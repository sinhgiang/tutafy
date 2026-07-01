'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Plus, CalendarClock, Ban } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

interface Slot { id: string; day_of_week: number; start_time: string; end_time: string }
interface Exception { id: string; date: string; reason: string | null }

export default function AvailabilityPage() {
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(true)
  const [newDay, setNewDay] = useState<string>('1')
  const [newStart, setNewStart] = useState<string>('09:00')
  const [newEnd, setNewEnd] = useState<string>('17:00')
  const [saving, setSaving] = useState(false)
  const [newExDate, setNewExDate] = useState<string>('')
  const [newExReason, setNewExReason] = useState<string>('')
  const [savingEx, setSavingEx] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: s }, { data: e }] = await Promise.all([
      supabase.from('availability').select('*').eq('tutor_id', user.id).order('day_of_week'),
      supabase.from('availability_exceptions').select('*').eq('tutor_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true }).limit(30),
    ])
    setSlots(s ?? [])
    setExceptions(e ?? [])
    setLoading(false)
  }

  async function addSlot() {
    if (newStart >= newEnd) { toast.error('End time must be after start time'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('availability').insert({
      tutor_id: user.id, day_of_week: parseInt(newDay), start_time: newStart, end_time: newEnd,
    }).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    setSlots(prev => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week))
    toast.success('Slot added!')
    setSaving(false)
  }

  async function deleteSlot(id: string) {
    await supabase.from('availability').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
    toast.success('Removed')
  }

  async function addException() {
    if (!newExDate) { toast.error('Select a date'); return }
    setSavingEx(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('availability_exceptions').upsert({
      tutor_id: user.id, date: newExDate, reason: newExReason.trim() || null,
    }, { onConflict: 'tutor_id,date' }).select().single()
    if (error) { toast.error(error.message); setSavingEx(false); return }
    setExceptions(prev => [...prev.filter(e => e.date !== newExDate), data].sort((a, b) => a.date.localeCompare(b.date)))
    setNewExDate('')
    setNewExReason('')
    toast.success('Date blocked!')
    setSavingEx(false)
  }

  async function deleteException(id: string) {
    await supabase.from('availability_exceptions').delete().eq('id', id)
    setExceptions(prev => prev.filter(e => e.id !== id))
    toast.success('Unblocked')
  }

  const grouped = DAYS.reduce((acc, _, i) => {
    acc[i] = slots.filter(s => s.day_of_week === i)
    return acc
  }, {} as Record<number, Slot[]>)

  const today = new Date().toISOString().split('T')[0]

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-[700px] space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Availability</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Set your weekly schedule and block specific dates</p>
      </div>

      {/* Add recurring slot */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-[12px] font-semibold text-gray-700 mb-3">Add recurring time slot</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-[11px] text-gray-400 mb-1.5">Day</p>
            <Select value={newDay} onValueChange={v => setNewDay(v ?? '1')}>
              <SelectTrigger className="w-36 text-[13px] border-gray-200 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)} className="text-[13px]">{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1.5">From</p>
            <Select value={newStart} onValueChange={v => setNewStart(v ?? '09:00')}>
              <SelectTrigger className="w-28 text-[13px] border-gray-200 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1.5">To</p>
            <Select value={newEnd} onValueChange={v => setNewEnd(v ?? '17:00')}>
              <SelectTrigger className="w-28 text-[13px] border-gray-200 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <button onClick={addSlot} disabled={saving}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition-colors px-4 h-9 rounded-lg">
            <Plus className="h-3.5 w-3.5" /> Add slot
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      {slots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
            <CalendarClock className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-[13px] text-gray-500">No availability set yet</p>
          <p className="text-[12px] text-gray-400 mt-0.5">Add your first time slot above</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {DAYS.map((day, i) => grouped[i]?.length > 0 && (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <p className="text-[12px] font-semibold text-gray-600 w-24 flex-shrink-0">{day}</p>
              <div className="flex flex-wrap gap-2">
                {grouped[i].map(slot => (
                  <div key={slot.id} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[12px] font-medium">
                    <span>{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                    <button onClick={() => deleteSlot(slot.id)} className="hover:text-red-500 transition-colors ml-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date exceptions */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
          <Ban className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Block specific dates</p>
          <span className="text-[11px] text-gray-400 ml-1">— vacation, sick days, holidays</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-[11px] text-gray-400 mb-1.5">Date</p>
              <input type="date" value={newExDate} min={today}
                onChange={e => setNewExDate(e.target.value)}
                className="text-[13px] px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors h-9" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <p className="text-[11px] text-gray-400 mb-1.5">Reason <span className="text-gray-300">(optional)</span></p>
              <input type="text" value={newExReason} onChange={e => setNewExReason(e.target.value)}
                placeholder="e.g. Public holiday"
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors h-9" />
            </div>
            <button onClick={addException} disabled={savingEx || !newExDate}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors px-4 h-9 rounded-lg">
              <Ban className="h-3.5 w-3.5" /> Block date
            </button>
          </div>

          {exceptions.length === 0 ? (
            <p className="text-[12px] text-gray-300 py-2">No dates blocked — students can book on all your available days.</p>
          ) : (
            <div className="space-y-2">
              {exceptions.map(ex => (
                <div key={ex.id} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <Ban className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-800">
                      {new Date(ex.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    {ex.reason && <p className="text-[11px] text-gray-500 mt-0.5">{ex.reason}</p>}
                  </div>
                  <button onClick={() => deleteException(ex.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
