'use client'

// "Pick a week" (T-1105): four ready-made weekly schedules, one press each. It sits on the dashboard card and on the empty Availability page, and is shown only to
// a tutor with no free hours. A press sends the preset id to /api/availability/preset (src/lib/hours-presets.ts), which writes the rows for the signed-in tutor;
// the page then loads again (the dashboard) or reads its list again (Availability), so the step turns to done by itself. No router is used, so the card draws
// the same inside any page and in the tests.
import { useState } from 'react'
import Link from 'next/link'
import { HOURS_PRESETS } from '@/lib/hours-presets'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

export function QuickHours({ timezone, onSaved }: { timezone?: string | null; onSaved?: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  async function pick(id: string) {
    if (busy) return
    setBusy(id)
    setError('')
    setSaved('')
    try {
      const res = await fetch('/api/availability/preset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preset: id }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; label?: string; detail?: string }
      if (!res.ok) {
        setError(body.error ?? 'We could not save your hours. Please try again.')
        return
      }
      setSaved(`Saved: ${body.detail ?? body.label ?? 'your hours'}. You can change them any time under Availability.`)
      if (onSaved) onSaved()
      else setTimeout(() => window.location.reload(), 1200)
    } catch {
      setError('We could not save your hours. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div data-testid="quick-hours" className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 sm:p-4">
      <p className="text-[14px] font-bold text-gray-900">Pick a week in one tap</p>
      <p className="text-[13px] text-gray-700 mt-0.5">
        Students can book you inside these hours. You can change any of them later.{' '}
        {timezone ? <>Times are in your time zone, <b>{timezone.replace(/_/g, ' ')}</b>. </> : <>Times are in your time zone. </>}
        <Link href="/settings?tab=booking" className="font-semibold text-indigo-700 underline underline-offset-2">Check it</Link>
      </p>
      <div role="group" aria-label="Ready-made weekly hours" className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {HOURS_PRESETS.map(p => (
          <button key={p.id} type="button" onClick={() => void pick(p.id)} disabled={busy !== null} data-testid={`preset-${p.id}`} aria-busy={busy === p.id}
            className={`text-left min-h-14 px-3.5 py-2.5 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 disabled:opacity-60 ${FOCUS}`}>
            <span className="block text-[14px] font-bold text-gray-900">{busy === p.id ? 'Saving...' : p.label}</span>
            <span className="block text-[12.5px] text-gray-600">{p.detail}</span>
          </button>
        ))}
      </div>
      {saved && <p role="status" data-testid="quick-hours-saved" className="mt-2 text-[13px] font-semibold text-emerald-800">{saved}</p>}
      {error && <p role="alert" data-testid="quick-hours-error" className="mt-2 text-[13px] text-red-700">{error}</p>}
      <p className="mt-2.5 text-[13px] text-gray-700">
        Want something else? <Link href="/availability" className="font-semibold text-indigo-700 underline underline-offset-2">Set your own hours</Link>
      </p>
    </div>
  )
}
