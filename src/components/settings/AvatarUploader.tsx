'use client'

// The profile photo in Settings, Profile (T-0766). Choosing a file uploads it at once (it is not part of the Save button of the form below):
// the browser makes it smaller (src/lib/avatar-client.ts) and sends it to /api/tutors/avatar, which checks who is asking, what the file really
// is and how big it is. The words after an upload say what happened, in a status line a screen reader reads out.
import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { prepareAvatar, pickProblem } from '@/lib/avatar-client'
import { initialsOf } from '@/lib/tutor-profile'

type Message = { kind: 'ok' | 'error'; text: string }
const BTN = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed'

export function AvatarUploader({ name, url, onChange }: { name: string; url: string | null; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [message, setMessage] = useState<Message | null>(null)

  async function send(init: RequestInit): Promise<{ ok: boolean; body: { url?: string; error?: string } }> {
    try {
      const res = await fetch('/api/tutors/avatar', init)
      const body = await res.json().catch(() => ({}))
      return { ok: res.ok, body }
    } catch {
      return { ok: false, body: { error: 'We could not reach the server. Check your connection and try again.' } }
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // so choosing the same file again still counts
    if (!file) return
    const problem = pickProblem(file)
    if (problem) { setMessage({ kind: 'error', text: problem }); return }
    setBusy('upload'); setMessage(null)
    const prepared = await prepareAvatar(file)
    if (!prepared.ok) { setBusy(null); setMessage({ kind: 'error', text: prepared.error }); return }
    const { ok, body } = await send({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: prepared.base64 }) })
    setBusy(null)
    if (ok && body.url) { onChange(body.url); setMessage({ kind: 'ok', text: 'Photo saved. Students see it on your profile.' }) }
    else setMessage({ kind: 'error', text: body.error ?? 'We could not save the photo. Please try again.' })
  }

  async function onRemove() {
    setBusy('remove'); setMessage(null)
    const { ok, body } = await send({ method: 'DELETE' })
    setBusy(null)
    if (ok) { onChange(null); setMessage({ kind: 'ok', text: 'Photo removed.' }) }
    else setMessage({ kind: 'error', text: body.error ?? 'We could not remove the photo. Please try again.' })
  }

  return (
    <div data-testid="avatar-uploader">
      <p className="block text-[12px] font-medium text-gray-600 mb-1.5" id="avatar-label">Profile photo</p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Photo of ${name || 'you'}`} width={96} height={96} data-testid="avatar-preview" className="w-24 h-24 rounded-full object-cover bg-indigo-50 shrink-0" />
        ) : (
          <div role="img" aria-label="No photo yet" data-testid="avatar-initials" className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[28px] font-bold shrink-0">
            {initialsOf(name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onPick} data-testid="avatar-input" />
            <button type="button" onClick={() => input.current?.click()} disabled={busy !== null}
              className={`${BTN} text-white bg-indigo-600 hover:bg-indigo-700`}>
              <Camera className="h-4 w-4" aria-hidden="true" /> {busy === 'upload' ? 'Uploading…' : url ? 'Change photo' : 'Upload photo'}
            </button>
            {url && (
              <button type="button" onClick={onRemove} disabled={busy !== null} className={`${BTN} text-gray-700 bg-white border border-gray-200 hover:bg-gray-50`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> {busy === 'remove' ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>
          <p className="text-[12px] text-gray-500 mt-2">A clear photo of your face, smiling, in good light. JPG, PNG or WebP, up to 2 MB after we make it smaller. It is shown on your public profile.</p>
          <p role="status" aria-live="polite" data-testid="avatar-message" className={`text-[12.5px] mt-1.5 min-h-[18px] ${message?.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{message?.text ?? ''}</p>
        </div>
      </div>
    </div>
  )
}
