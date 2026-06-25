'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Calendar, Clock, CheckCircle } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DURATIONS = [30, 45, 60, 90]

interface Availability { day_of_week: number; start_time: string; end_time: string }
interface Tutor { id: string; name: string; timezone: string; cancellation_hours: number }

function generateSlots(avail: Availability[], date: string, duration: number) {
  if (!date) return []
  const d = new Date(date + 'T00:00:00')
  const dayOfWeek = d.getDay()
  const dayAvail = avail.filter(a => a.day_of_week === dayOfWeek)
  const slots: string[] = []
  for (const a of dayAvail) {
    const [sh, sm] = a.start_time.split(':').map(Number)
    const [eh, em] = a.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em
    while (cur + duration <= end) {
      const h = Math.floor(cur / 60).toString().padStart(2, '0')
      const m = (cur % 60).toString().padStart(2, '0')
      slots.push(`${h}:${m}`)
      cur += duration
    }
  }
  return slots
}

export function BookingForm({ tutor, availability }: { tutor: Tutor; availability: Availability[] }) {
  const [step, setStep] = useState<'pick' | 'form' | 'done'>('pick')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const slots = generateSlots(availability, date, duration)
  const minDate = new Date().toISOString().split('T')[0]

  const availableDays = [...new Set(availability.map(a => a.day_of_week))]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutorId: tutor.id, date, time, duration, name, email, message }),
    })

    if (res.ok) {
      setStep('done')
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Booking failed. Please try again.')
    }
    setLoading(false)
  }

  if (step === 'done') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
          <p className="text-gray-500 mt-2">
            You&apos;re booked with <strong>{tutor.name}</strong> on <strong>{date}</strong> at <strong>{time}</strong>.
          </p>
          <p className="text-sm text-gray-400 mt-3">A confirmation email will be sent to {email}.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Choose date & time
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={v => { setDuration(parseInt(v ?? '60')); setTime('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" min={minDate} value={date}
                onChange={e => { setDate(e.target.value); setTime('') }} />
            </div>
          </div>

          {date && availableDays.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">This tutor hasn&apos;t set availability yet.</p>
          )}

          {date && slots.length === 0 && availableDays.length > 0 && (
            <p className="text-sm text-gray-500">No slots available on this day. Try another date.</p>
          )}

          {slots.length > 0 && (
            <div className="space-y-2">
              <Label>Available times</Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map(slot => (
                  <button key={slot} onClick={() => setTime(slot)}
                    className={`text-sm py-2 px-3 rounded-lg border transition-colors ${
                      time === slot
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                    }`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {date && time && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Your details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
                Booking <strong>{duration} min</strong> lesson on <strong>{date}</strong> at <strong>{time}</strong>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your name *</Label>
                  <Input placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message (optional)</Label>
                <Input placeholder="What would you like to focus on?" value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
