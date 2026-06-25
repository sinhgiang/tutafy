'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Plus } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

interface Slot { id: string; day_of_week: number; start_time: string; end_time: string }

export default function AvailabilityPage() {
  const supabase = createClient()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [newDay, setNewDay] = useState<string>('1')
  const [newStart, setNewStart] = useState<string>('09:00')
  const [newEnd, setNewEnd] = useState<string>('17:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSlots()
  }, [])

  async function loadSlots() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('tutor_id', user.id)
      .order('day_of_week')
    setSlots(data ?? [])
    setLoading(false)
  }

  async function addSlot() {
    if (newStart >= newEnd) {
      toast.error('End time must be after start time')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from('availability').insert({
      tutor_id: user.id,
      day_of_week: parseInt(newDay),
      start_time: newStart,
      end_time: newEnd,
    }).select().single()

    if (error) { toast.error(error.message); setSaving(false); return }
    setSlots(prev => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week))
    toast.success('Availability added!')
    setSaving(false)
  }

  async function deleteSlot(id: string) {
    await supabase.from('availability').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
    toast.success('Removed')
  }

  const grouped = DAYS.reduce((acc, _, i) => {
    acc[i] = slots.filter(s => s.day_of_week === i)
    return acc
  }, {} as Record<number, Slot[]>)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        <p className="text-sm text-gray-500 mt-1">Set your recurring weekly availability for bookings</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add time slot</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Day</p>
              <Select value={newDay} onValueChange={(v) => setNewDay(v ?? '1')}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">From</p>
              <Select value={newStart} onValueChange={(v) => setNewStart(v ?? '09:00')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">To</p>
              <Select value={newEnd} onValueChange={(v) => setNewEnd(v ?? '17:00')}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addSlot} disabled={saving} className="gap-2">
              <Plus className="h-4 w-4" />
              Add slot
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {DAYS.map((day, i) => (
          (grouped[i]?.length > 0) && (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 w-28">{day}</p>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {grouped[i].map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                        <span>{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}</span>
                        <button onClick={() => deleteSlot(slot.id)} className="hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ))}
        {!loading && slots.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No availability set yet. Add your first time slot above.</p>
        )}
      </div>
    </div>
  )
}
