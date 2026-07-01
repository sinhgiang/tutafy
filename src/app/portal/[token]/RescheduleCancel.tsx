'use client'

import { useState } from 'react'
import { Calendar, X, AlertTriangle, Check, Loader2 } from 'lucide-react'

const TIMES = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

export function RescheduleCancel({
  lessonId, token, startsAt, cancellationHours,
}: {
  lessonId: string
  token: string
  startsAt: string
  cancellationHours: number
}) {
  const [mode, setMode] = useState<'idle' | 'cancel' | 'reschedule'>('idle')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('09:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<'cancelled' | 'rescheduled' | null>(null)

  const lessonStart = new Date(startsAt)
  const hoursUntil = (lessonStart.getTime() - Date.now()) / 3600000
  const withinPolicy = hoursUntil < cancellationHours
  const todayStr = new Date().toISOString().split('T')[0]

  async function doCancel() {
    setLoading(true); setError('')
    const res = await fetch(`/api/portal/${token}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId }),
    })
    const d = await res.json()
    setLoading(false)
    if (res.ok) { setDone('cancelled'); setMode('idle') }
    else setError(d.error ?? 'Failed to cancel')
  }

  async function doReschedule() {
    if (!newDate || !newTime) { setError('Select date and time'); return }
    setLoading(true); setError('')
    const res = await fetch(`/api/portal/${token}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, new_date: newDate, new_time: newTime }),
    })
    const d = await res.json()
    setLoading(false)
    if (res.ok) { setDone('rescheduled'); setMode('idle') }
    else setError(d.error ?? 'Failed to reschedule')
  }

  if (done === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
        <X className="h-3 w-3" /> Cancelled
      </div>
    )
  }

  if (done === 'rescheduled') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
        <Check className="h-3 w-3" /> Rescheduled!
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {mode === 'idle' && (
        <div className="flex gap-2">
          <button onClick={() => { setMode('reschedule'); setError('') }}
            className="text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Reschedule
          </button>
          <button onClick={() => { setMode('cancel'); setError('') }}
            className="text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}

      {mode === 'cancel' && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 w-full max-w-xs">
          {withinPolicy ? (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-gray-800">Late cancellation</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  This lesson is within {cancellationHours}h. Contact your tutor directly to cancel.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-[12px] font-semibold text-gray-800 mb-1">Cancel this lesson?</p>
              <p className="text-[11px] text-gray-500 mb-3">
                {lessonStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              {error && <p className="text-[11px] text-red-500 mb-2">{error}</p>}
              <div className="flex gap-2">
                <button onClick={doCancel} disabled={loading}
                  className="flex-1 text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Confirm cancel
                </button>
                <button onClick={() => { setMode('idle'); setError('') }}
                  className="px-3 text-[12px] text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Back
                </button>
              </div>
            </>
          )}
          {withinPolicy && (
            <button onClick={() => { setMode('idle'); setError('') }}
              className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
              ← Back
            </button>
          )}
        </div>
      )}

      {mode === 'reschedule' && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 w-full max-w-xs">
          <p className="text-[12px] font-semibold text-gray-800 mb-3">Pick a new date & time</p>
          <div className="space-y-2.5 mb-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Date</label>
              <input type="date" value={newDate} min={todayStr}
                onChange={e => setNewDate(e.target.value)}
                className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Time</label>
              <select value={newTime} onChange={e => setNewTime(e.target.value)}
                className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30">
                {TIMES.map(t => {
                  const [h, m] = t.split(':').map(Number)
                  const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
                  return <option key={t} value={t}>{label}</option>
                })}
              </select>
            </div>
          </div>
          {error && <p className="text-[11px] text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={doReschedule} disabled={loading || !newDate}
              className="flex-1 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Confirm
            </button>
            <button onClick={() => { setMode('idle'); setError('') }}
              className="px-3 text-[12px] text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
