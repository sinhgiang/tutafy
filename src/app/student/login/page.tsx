'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle, BookOpen } from 'lucide-react'

export default function StudentLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/student/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-[22px] font-bold text-gray-900">Check your email!</h1>
        <p className="text-[14px] text-gray-500 mt-2 max-w-[320px]">
          We sent a link to <strong>{email}</strong>. Click it to view your lessons.
        </p>
        <p className="text-[12px] text-gray-400 mt-4">
          The link expires in 7 days. Check your spam folder if you don&apos;t see it.
        </p>
        <button onClick={() => { setSent(false); setEmail('') }}
          className="mt-6 text-[13px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
          Try a different email
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-[380px]">
        {/* Icon */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-indigo-600" />
          </div>
          <h1 className="text-[22px] font-bold text-gray-900">View your lessons</h1>
          <p className="text-[13px] text-gray-400 mt-1.5">
            Enter your email to receive a link to your lessons and homework.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
              className="w-full text-[14px] pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              'Send me my lessons link'
            )}
          </button>
        </form>

        <p className="text-center text-[12px] text-gray-400 mt-5">
          Are you a tutor?{' '}
          <a href="/login" className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  )
}
