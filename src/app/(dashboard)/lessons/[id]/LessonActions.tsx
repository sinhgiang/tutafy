'use client'

import { useState } from 'react'
import { Sparkles, Mail, Loader2, CheckCircle, Copy, UserX } from 'lucide-react'

export function LessonActions({
  lessonId,
  hasPrice,
  studentEmail,
  isCompleted,
  isScheduled,
  lessonStatus,
}: {
  lessonId: string
  hasPrice: boolean
  studentEmail: string | null
  isCompleted: boolean
  isScheduled?: boolean
  lessonStatus?: string
}) {
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [invoiceSending, setInvoiceSending] = useState(false)
  const [invoiceSent, setInvoiceSent] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const [noShowLoading, setNoShowLoading] = useState(false)
  const [noShowDone, setNoShowDone] = useState(lessonStatus === 'no_show')

  async function generateSummary(sendEmail = false) {
    if (sendEmail) {
      setSendingEmail(true)
    } else {
      setSummaryLoading(true)
      setSummary('')
    }

    const res = await fetch('/api/ai/lesson-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, send_email: sendEmail }),
    })
    const data = await res.json()

    if (sendEmail) {
      setSendingEmail(false)
      if (res.ok) setEmailSent(true)
    } else {
      setSummaryLoading(false)
      setSummary(data.summary ?? data.error ?? 'Failed to generate')
    }
  }

  async function sendInvoice() {
    setInvoiceSending(true)
    setInvoiceError('')
    const res = await fetch('/api/invoices/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId }),
    })
    const data = await res.json()
    setInvoiceSending(false)
    if (res.ok) {
      setInvoiceSent(true)
    } else {
      setInvoiceError(data.error ?? 'Failed to send invoice')
    }
  }

  async function markNoShow() {
    setNoShowLoading(true)
    await fetch(`/api/lessons/${lessonId}/no-show`, { method: 'POST' })
    setNoShowLoading(false)
    setNoShowDone(true)
  }

  return (
    <div className="space-y-3">
      {/* No-show */}
      {isScheduled && new Date() > new Date(Date.now()) && !noShowDone && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Student didn&apos;t show up?</p>
            <p className="text-[12px] text-gray-400 mt-0.5">Mark as no-show and notify the student</p>
          </div>
          <button onClick={markNoShow} disabled={noShowLoading}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-gray-500 hover:bg-gray-600 disabled:opacity-60 px-3 py-2 rounded-lg transition-colors">
            {noShowLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
            Mark no-show
          </button>
        </div>
      )}
      {noShowDone && lessonStatus !== 'completed' && (
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-center gap-2">
          <UserX className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] text-gray-500">Marked as no-show · Student notified</p>
        </div>
      )}

      {/* AI Lesson Summary */}
      {isCompleted && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <p className="text-[13px] font-semibold text-gray-900">AI Lesson Summary</p>
          </div>

          {summary ? (
            <div className="space-y-3">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(summary)}
                  className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
                {studentEmail && !emailSent && (
                  <button
                    onClick={() => generateSummary(true)}
                    disabled={sendingEmail}
                    className="flex items-center gap-1.5 text-[12px] text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {sendingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                    {sendingEmail ? 'Sending...' : 'Email to Student'}
                  </button>
                )}
                {emailSent && (
                  <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <CheckCircle className="h-3 w-3" /> Sent!
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => generateSummary(false)}
                disabled={summaryLoading}
                className="flex items-center gap-1.5 text-[12px] font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
              >
                {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {summaryLoading ? 'Generating...' : 'Generate Summary'}
              </button>
              {studentEmail && (
                <button
                  onClick={() => generateSummary(true)}
                  disabled={sendingEmail}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
                >
                  {sendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  {sendingEmail ? 'Sending...' : 'Generate & Email'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Send Invoice */}
      {hasPrice && studentEmail && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">Invoice</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Send payment invoice to {studentEmail}</p>
            </div>
            {invoiceSent ? (
              <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> Invoice Sent
              </span>
            ) : (
              <button
                onClick={sendInvoice}
                disabled={invoiceSending}
                className="flex items-center gap-1.5 text-[12px] font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
              >
                {invoiceSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                {invoiceSending ? 'Sending...' : 'Send Invoice'}
              </button>
            )}
          </div>
          {invoiceError && <p className="text-[12px] text-red-500 mt-2">{invoiceError}</p>}
        </div>
      )}
    </div>
  )
}
