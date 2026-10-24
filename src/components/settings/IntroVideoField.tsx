'use client'

// The intro video link in Settings, Profile (T-0915). A tutor pastes a link to a video on YouTube or Vimeo and presses Save; the link is checked in the browser
// with the same rule as on the server (src/lib/intro-video.ts), so a wrong link is explained before anything is sent, and the server checks it again
// (/api/tutors/intro-video). Like the photo, it is not part of the Save button of the form below. The words after a save say what happened, in a status line
// a screen reader reads out. The video itself stays on YouTube or Vimeo.
import { useState } from 'react'
import { Link2, Trash2 } from 'lucide-react'
import { INTRO_VIDEO_HELP, parseIntroVideo } from '@/lib/intro-video'

type Message = { kind: 'ok' | 'error'; text: string }
const BTN = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60'

export function IntroVideoField({ url, onChange }: { url: string | null; onChange: (url: string | null) => void }) {
  const [text, setText] = useState(url ?? '')
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null)
  const [message, setMessage] = useState<Message | null>(null)

  async function send(init: RequestInit): Promise<{ ok: boolean; body: { url?: string; error?: string } }> {
    try {
      const res = await fetch('/api/tutors/intro-video', init)
      const body = await res.json().catch(() => ({}))
      return { ok: res.ok, body }
    } catch {
      return { ok: false, body: { error: 'We could not reach the server. Check your connection and try again.' } }
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseIntroVideo(text)
    if (!parsed.ok) { setMessage({ kind: 'error', text: parsed.error }); return }
    setBusy('save'); setMessage(null)
    const { ok, body } = await send({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: text }) })
    setBusy(null)
    if (ok && body.url) { onChange(body.url); setText(body.url); setMessage({ kind: 'ok', text: 'Video saved. It plays at the top of your public profile.' }) }
    else setMessage({ kind: 'error', text: body.error ?? 'We could not save the video. Please try again.' })
  }

  async function onRemove() {
    setBusy('remove'); setMessage(null)
    const { ok, body } = await send({ method: 'DELETE' })
    setBusy(null)
    if (ok) { onChange(null); setText(''); setMessage({ kind: 'ok', text: 'Video removed.' }) }
    else setMessage({ kind: 'error', text: body.error ?? 'We could not remove the video. Please try again.' })
  }

  return (
    <form onSubmit={onSave} data-testid="intro-video-field" noValidate>
      <label htmlFor="settings-intro-video" className="block text-[12px] font-medium text-gray-600 mb-1.5">Intro video link (optional)</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input id="settings-intro-video" type="url" inputMode="url" autoComplete="off" spellCheck={false} value={text} onChange={e => { setText(e.target.value); setMessage(null) }}
          placeholder="https://www.youtube.com/watch?v=…" aria-describedby="settings-intro-video-help settings-intro-video-status" aria-invalid={message?.kind === 'error'}
          className="w-full text-[13px] px-3 py-2 min-h-10 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
        <div className="flex gap-2 shrink-0">
          <button type="submit" disabled={busy !== null || text.trim() === ''} className={`${BTN} text-white bg-indigo-600 hover:bg-indigo-700`}>
            <Link2 className="h-4 w-4" aria-hidden="true" /> {busy === 'save' ? 'Saving…' : url ? 'Change video' : 'Save video'}
          </button>
          {url && (
            <button type="button" onClick={onRemove} disabled={busy !== null} className={`${BTN} text-gray-700 bg-white border border-gray-200 hover:bg-gray-50`}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {busy === 'remove' ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
      </div>
      <p id="settings-intro-video-help" className="text-[12px] text-gray-500 mt-2">{INTRO_VIDEO_HELP} It plays at the top of your public profile only after a visitor presses play.</p>
      <p id="settings-intro-video-status" role="status" aria-live="polite" data-testid="intro-video-message" className={`text-[12.5px] mt-1.5 min-h-[18px] ${message?.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{message?.text ?? ''}</p>
    </form>
  )
}
