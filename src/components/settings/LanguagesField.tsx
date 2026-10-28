'use client'

// The languages a tutor teaches, in Settings, Profile (T-1032). A tutor types the names separated by commas and presses Save; the text is checked in the browser
// with the same rule as on the server (src/lib/tutor-languages.ts), so a wrong name is explained before anything is sent, and the server checks it again
// (/api/tutors/languages). Like the photo and the intro video, it is not part of the Save button of the form below: it saves by itself and says what happened in
// a status line a screen reader reads out. The tutor's own list is read when the box appears, so this field touches nothing else of the Settings page.
import { useEffect, useState } from 'react'
import { Languages } from 'lucide-react'
import { LANGUAGES_HELP, languagesToText, parseLanguages } from '@/lib/tutor-languages'

type Message = { kind: 'ok' | 'error'; text: string }
const BTN = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60'

export function LanguagesField() {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/tutors/languages')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((b: { languages?: string[] }) => {
        if (!alive) return
        const t = languagesToText(Array.isArray(b.languages) ? b.languages : [])
        setText(t); setSaved(t); setLoaded(true)
      })
      .catch(() => { if (alive) { setLoaded(true); setMessage({ kind: 'error', text: 'We could not load your languages. Reload the page to try again.' }) } })
    return () => { alive = false }
  }, [])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseLanguages(text)
    if (!parsed.ok) { setMessage({ kind: 'error', text: parsed.error }); return }
    setBusy(true); setMessage(null)
    try {
      const res = await fetch('/api/tutors/languages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ languages: parsed.languages }) })
      const body = await res.json().catch(() => ({})) as { languages?: string[]; error?: string }
      if (res.ok && Array.isArray(body.languages)) {
        const t = languagesToText(body.languages)
        setText(t); setSaved(t)
        setMessage({ kind: 'ok', text: body.languages.length > 0 ? 'Languages saved. They show on your public profile.' : 'Languages removed from your profile.' })
      } else setMessage({ kind: 'error', text: body.error ?? 'We could not save your languages. Please try again.' })
    } catch {
      setMessage({ kind: 'error', text: 'We could not reach the server. Check your connection and try again.' })
    }
    setBusy(false)
  }

  return (
    <form onSubmit={onSave} data-testid="languages-field" noValidate>
      <label htmlFor="settings-languages" className="block text-[12px] font-medium text-gray-600 mb-1.5">Languages you teach</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input id="settings-languages" type="text" autoComplete="off" spellCheck={false} maxLength={200} value={text} disabled={!loaded}
          onChange={e => { setText(e.target.value); setMessage(null) }} placeholder="English, Spanish"
          aria-describedby="settings-languages-help settings-languages-status" aria-invalid={message?.kind === 'error'}
          className="w-full text-[13px] px-3 py-2 min-h-10 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors disabled:bg-gray-50" />
        <button type="submit" disabled={busy || !loaded || text.trim() === saved.trim()} className={`${BTN} shrink-0 text-white bg-indigo-600 hover:bg-indigo-700`}>
          <Languages className="h-4 w-4" aria-hidden="true" /> {busy ? 'Saving…' : 'Save languages'}
        </button>
      </div>
      <p id="settings-languages-help" className="text-[12px] text-gray-500 mt-2">{LANGUAGES_HELP}</p>
      <p id="settings-languages-status" role="status" aria-live="polite" data-testid="languages-message" className={`text-[12.5px] mt-1.5 min-h-[18px] ${message?.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{message?.text ?? ''}</p>
    </form>
  )
}
