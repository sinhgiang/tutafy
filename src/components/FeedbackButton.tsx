'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FEEDBACK_KINDS, FEEDBACK_KIND_LABELS, FEEDBACK_MAX_LENGTH, type FeedbackKind } from '@/lib/feedback'

// A small Feedback button and the box it opens (T-0723): pick bug, idea or question, write, send.
// It sends to /api/feedback, which learns who is writing from the signed-in session, or from the student link passed as `token`
// (the student page has no session). Nothing else about the sender is collected here: no page address, no browser details.
// The words are English only, like the rest of the tutor and student pages.

type Status = 'idle' | 'sending' | 'sent'

/** What the person is told for each answer of the server. */
export function feedbackErrorText(status: number | null, serverText?: string): string {
  if (status === 429) return 'You have sent a lot of feedback just now. Please try again in a little while.'
  if (status === 401 || status === 403) return 'Please sign in again, then try once more.'
  if (status === 400 && serverText) return serverText
  if (status === 503) return 'Feedback is not available right now. Please try again later.'
  return 'Your message could not be sent. Please check your connection and try again.'
}

export function FeedbackButton({ token, className = '', iconOnlyOnPhone = false }: { token?: string; className?: string; iconOnlyOnPhone?: boolean }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')

  function show(next: boolean) {
    setOpen(next)
    if (!next && status === 'sent') { setStatus('idle'); setMessage(''); setKind('idea') }
    if (!next) setError('')
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'sending' || !message.trim()) return
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, message, ...(token ? { token } : {}) }),
      })
      if (res.ok) { setStatus('sent'); return }
      let serverText: string | undefined
      try { serverText = ((await res.json()) as { error?: string }).error } catch { /* no body */ }
      setError(feedbackErrorText(res.status, serverText))
    } catch {
      setError(feedbackErrorText(null))
    }
    setStatus('idle')
  }

  return (
    <>
      <button type="button" onClick={() => show(true)} data-testid="feedback-button" aria-haspopup="dialog" aria-label="Send feedback"
        className={`inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors rounded-lg px-2.5 py-1.5 ${className}`}>
        <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
        <span className={iconOnlyOnPhone ? 'hidden sm:inline' : ''}>Feedback</span>
      </button>

      <Dialog open={open} onOpenChange={show}>
        <DialogContent className="sm:max-w-md" data-testid="feedback-dialog">
          {status === 'sent' ? (
            <div className="text-center py-4" data-testid="feedback-sent" role="status">
              <DialogTitle>Thank you!</DialogTitle>
              <DialogDescription className="mt-2">We read every message. If you asked a question, we will answer by email.</DialogDescription>
              <button type="button" onClick={() => show(false)}
                className="mt-5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-lg px-5 py-2">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={send} data-testid="feedback-form" className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Send feedback</DialogTitle>
                <DialogDescription>Tell us what is wrong, what you would like, or what you could not find out.</DialogDescription>
              </DialogHeader>

              <div role="radiogroup" aria-label="What kind of feedback" className="grid grid-cols-3 gap-2">
                {FEEDBACK_KINDS.map(k => (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} data-testid={`feedback-kind-${k}`}
                    title={FEEDBACK_KIND_LABELS[k].hint}
                    className={`text-[13px] font-semibold rounded-lg border px-2 py-2 transition-colors ${kind === k ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {FEEDBACK_KIND_LABELS[k].label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-gray-500 -mt-2">{FEEDBACK_KIND_LABELS[kind].hint}</p>

              <div>
                <label htmlFor="feedback-message" className="sr-only">Your message</label>
                <textarea id="feedback-message" value={message} onChange={e => setMessage(e.target.value)} maxLength={FEEDBACK_MAX_LENGTH} required rows={5}
                  placeholder="Write your message here" data-testid="feedback-message"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-y" />
                <p className="text-[11px] text-gray-400 text-right mt-1" aria-live="off">{message.length}/{FEEDBACK_MAX_LENGTH}</p>
              </div>

              {error && <p role="alert" data-testid="feedback-error" className="text-[12px] text-red-600 -mt-1">{error}</p>}

              <button type="submit" disabled={status === 'sending' || !message.trim()} data-testid="feedback-send"
                className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg px-5 py-2.5">
                {status === 'sending' ? 'Sending…' : 'Send'}
              </button>
              <p className="text-[11px] text-gray-400 -mt-2">We only keep your message and the email of your account.</p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
