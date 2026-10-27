'use client'

// The one-card review form (T-0898, design 2A): five stars (required), up to three tags and a few words (optional), what is public and for how long it
// can be edited, and who may review. A real fieldset with radio buttons for the stars and checkboxes for the tags, so the keyboard and a screen reader
// work as for any form. Saving goes to /api/reviews/flow, which knows the student by the portal link.
import { useState } from 'react'
import Link from 'next/link'
import { Check, CheckCircle2, Eye, Loader2, ShieldCheck, Star } from 'lucide-react'
import { MAX_COMMENT, MAX_TAGS, REVIEW_TAGS } from '@/lib/reviews-flow'

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || 'T'

export function ReviewCard(props: {
  token: string; lessonId: string; tutorName: string; lessonDate: string; shownAs: string; initialStars: number | null
  existing: { rating: number; tags: string[]; comment: string } | null; legacy: boolean; editable: boolean; editsOn: string | null
}) {
  const { token, lessonId, tutorName, lessonDate, shownAs, existing, legacy, editable } = props
  const [rating, setRating] = useState<number>(existing?.rating ?? props.initialStars ?? 0)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<null | 'new' | 'edited'>(null)

  if (done) {
    return (
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center grid gap-3 justify-items-center" aria-live="polite" data-testid="review-done">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h1 className="text-[22px] font-extrabold text-gray-900">{done === 'edited' ? 'Your review is updated' : 'Thank you for your review'}</h1>
        <p className="text-[14px] text-gray-700 max-w-[420px]">It is public with your first name and last initial ({shownAs}). You can edit it for 7 days from this page.</p>
        <Link href={`/portal/${token}`} className="inline-flex items-center min-h-11 px-5 rounded-xl text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700">Back to your lessons</Link>
      </section>
    )
  }

  if (legacy || (existing && !editable)) {
    return (
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 grid gap-2" data-testid="review-closed">
        <h1 className="text-[20px] font-extrabold text-gray-900">{legacy ? `You have already reviewed ${tutorName}` : 'This review can no longer be edited'}</h1>
        <p className="text-[14px] text-gray-700">{legacy ? 'One review for each tutor, so there is nothing more to add.' : 'A review can be edited for 7 days after it was written. It stays on the tutor’s page as you wrote it.'}</p>
        <p><Link href={`/portal/${token}`} className="text-[14px] font-bold text-indigo-700 underline underline-offset-2">Back to your lessons</Link></p>
      </section>
    )
  }

  const toggle = (id: string) => setTags(t => (t.includes(id) ? t.filter(x => x !== id) : t.length < MAX_TAGS ? [...t, id] : t))

  async function publish(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) { setError('Choose 1 to 5 stars first.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/reviews/flow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portal_token: token, lesson_id: lessonId, rating, tags, comment }) })
      const body = await res.json().catch(() => ({})) as { error?: string; edited?: boolean }
      if (res.ok) setDone(body.edited ? 'edited' : 'new')
      else setError(body.error ?? 'We could not save your review. Please try again.')
    } catch {
      setError('We could not reach Tutafy. Check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={publish} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6" data-testid="review-form">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center font-extrabold">{initials(tutorName)}</span>
        <div>
          <h1 className="text-[20px] font-extrabold text-gray-900 leading-tight">{existing ? `Edit your review of ${tutorName}` : `Review ${tutorName}`}</h1>
          <p className="text-[13px] text-gray-600">Lesson on {lessonDate}</p>
        </div>
      </div>

      <fieldset className="mt-5 min-w-0">
        <legend className="text-[14px] font-bold text-gray-900">Your rating <span className="ml-1 text-[12px] font-semibold text-indigo-700">Required</span></legend>
        <div className="mt-2 flex gap-1.5" role="radiogroup">
          {[1, 2, 3, 4, 5].map(n => (
            <label key={n} className="relative cursor-pointer">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
              <span className="sr-only">{`${n} ${n === 1 ? 'star' : 'stars'}`}</span>
              <Star aria-hidden="true" className={`h-10 w-10 p-1 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5 min-w-0">
        <legend className="text-[14px] font-bold text-gray-900">What stood out? <span className="ml-1 text-[12px] font-medium text-gray-600">Optional, up to {MAX_TAGS}</span></legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {REVIEW_TAGS.map(t => {
            const on = tags.includes(t.id)
            const full = !on && tags.length >= MAX_TAGS
            return (
              <label key={t.id} className={`relative ${full ? 'opacity-60' : ''}`}>
                <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(t.id)} className="peer sr-only" />
                <span className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full border text-[14px] font-semibold cursor-pointer select-none bg-white text-gray-800 border-gray-300 hover:border-indigo-300 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2">
                  {on && <Check className="h-4 w-4" aria-hidden="true" />}{t.label}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor="review-text" className="text-[14px] font-bold text-gray-900">Tell other students what it was like <span className="ml-1 text-[12px] font-medium text-gray-600">Optional</span></label>
        <textarea id="review-text" value={comment} maxLength={MAX_COMMENT} onChange={e => setComment(e.target.value)} rows={4}
          className="mt-2 w-full rounded-xl border border-gray-300 px-3.5 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
        <p className="text-right text-[12px] text-gray-600" aria-live="off">{comment.length} / {MAX_COMMENT}</p>
      </div>

      <p className="mt-2 flex items-start gap-2 text-[13px] text-gray-700"><Eye className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" /><span>Your review is public with your first name and last initial ({shownAs}). You can edit it for 7 days{props.editsOn ? ` (until ${props.editsOn})` : ''}.</span></p>

      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[14px] text-red-900" data-testid="review-error">{error}</p>}

      <button type="submit" disabled={busy} className="mt-4 w-full inline-flex items-center justify-center gap-2 min-h-12 rounded-xl text-[15px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{existing ? 'Save changes' : 'Publish my review'}
      </button>
      <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 px-3.5 py-2.5 text-[13px] text-gray-700"><ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /><span>Only students who have had a lesson with this tutor can write a review. Tutors cannot edit or remove a review.</span></p>
    </form>
  )
}

/** "Stop reminders" (the link of the invitation): a button, because opening a link in a mail must change nothing. */
export function StopRemindersCard({ token, lessonId, tutorName }: { token: string; lessonId: string; tutorName: string }) {
  const [state, setState] = useState<'ask' | 'busy' | 'done' | 'error'>('ask')
  async function stop() {
    setState('busy')
    try {
      const res = await fetch('/api/reviews/flow/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portal_token: token, lesson_id: lessonId }) })
      setState(res.ok ? 'done' : 'error')
    } catch { setState('error') }
  }
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 grid gap-3" data-testid="review-stop">
      <h1 className="text-[20px] font-extrabold text-gray-900">{state === 'done' ? 'No more reminders' : 'Stop reminders about reviewing ' + tutorName + '?'}</h1>
      {state === 'done'
        ? <p className="text-[14px] text-gray-700" role="status">We will not send another one. You can still rate any time from your student page.</p>
        : <>
            <p className="text-[14px] text-gray-700">We send this once, and one reminder if you do not answer. You can still rate any time from your student page.</p>
            {state === 'error' && <p role="alert" className="text-[14px] text-red-800">We could not save that. Please try again.</p>}
            <p><button type="button" onClick={stop} disabled={state === 'busy'} className="inline-flex items-center min-h-11 px-5 rounded-xl text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">Stop reminders</button></p>
          </>}
      <p><Link href={`/portal/${token}`} className="text-[14px] font-bold text-indigo-700 underline underline-offset-2">Back to your lessons</Link></p>
    </section>
  )
}
