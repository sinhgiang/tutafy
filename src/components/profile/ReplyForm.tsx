'use client'

// The tutor's one answer to a review (T-0898). Shown only to the signed-in tutor on their own profile, under a review that has no answer yet. The
// answer is public, is written once and cannot be edited or removed afterwards: the page says so before it is sent, and the server and the database
// both refuse a second one.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { MAX_REPLY } from '@/lib/reviews-flow'

export function ReplyForm({ reviewId }: { reviewId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) {
    return <p className="mt-3"><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center min-h-11 px-4 rounded-xl text-[14px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50" data-testid="reply-open">Reply to this review</button></p>
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/reviews/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ review_id: reviewId, reply: text }) })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (res.ok) { router.refresh(); return }
      setError(body.error ?? 'We could not save your answer. Please try again.')
    } catch {
      setError('We could not reach Tutafy. Check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={send} className="mt-3 grid gap-2" data-testid="reply-form">
      <label htmlFor={`reply-${reviewId}`} className="text-[13px] font-bold text-gray-900">Your reply</label>
      <textarea id={`reply-${reviewId}`} value={text} onChange={e => setText(e.target.value)} maxLength={MAX_REPLY} rows={3}
        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-[15px] text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
      <p className="text-[12.5px] text-gray-700">Your reply is public. You can answer once, and it cannot be edited or removed afterwards. {text.length} / {MAX_REPLY}</p>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-[14px] text-red-900">{error}</p>}
      <p><button type="submit" disabled={busy || text.trim() === ''} className="inline-flex items-center gap-2 min-h-11 px-5 rounded-xl text-[14px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Send reply</button></p>
    </form>
  )
}
