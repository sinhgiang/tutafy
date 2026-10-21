'use client'

// The "Duration" row of the new-lesson and edit-lesson pages (T-0700): one button for each length the tutor can pick (the five the
// pages always had, the lengths they offer on their booking page, the lesson's own length), and a Custom box for any other
// length: a whole number of minutes from 10 to 240, in steps of 5 (src/lib/lesson-durations.ts). The value is the number of
// minutes as text, the same string the pages kept before.
import { useState } from 'react'
import { lessonLengthOptions, parseCustomLength, MIN_DURATION, MAX_DURATION, DURATION_STEP } from '@/lib/lesson-durations'

export function DurationPicker({ value, onChange, offered }: { value: string; onChange: (minutes: string) => void; offered?: number[] | null }) {
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const options = lessonLengthOptions(offered ?? null, value)

  function applyCustom() {
    const parsed = parseCustomLength(custom, [])
    if (!parsed.ok) { setError(parsed.error); return }
    setError('')
    setCustom('')
    onChange(String(parsed.value))
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Duration">
        {options.map(d => (
          <button key={d} type="button" aria-pressed={value === String(d)} onClick={() => { setError(''); onChange(String(d)) }}
            className={`text-[13px] px-4 py-1.5 rounded-lg font-medium transition-all ${
              value === String(d) ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{d} min</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2 items-start">
        <div>
          <label htmlFor="lesson-custom-length" className="sr-only">Custom length in minutes</label>
          <input id="lesson-custom-length" type="text" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Custom, e.g. 75"
            value={custom} aria-invalid={error ? true : undefined} aria-describedby="lesson-custom-length-help"
            onChange={e => { setCustom(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustom() } }}
            className={`w-40 text-[13px] border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${error ? 'border-red-300' : 'border-gray-200'}`} />
        </div>
        <button type="button" onClick={applyCustom}
          className="text-[13px] px-4 py-1.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Use</button>
      </div>
      {error && <p role="alert" className="text-[12px] text-red-600 mt-1.5">{error}</p>}
      <p id="lesson-custom-length-help" className="text-[11px] text-gray-400 mt-1.5">{MIN_DURATION} to {MAX_DURATION} minutes, in steps of {DURATION_STEP}.</p>
    </div>
  )
}
