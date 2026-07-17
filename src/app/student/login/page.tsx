'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function StudentLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    // Carry role in a cookie; keep redirectTo as the plain allowlisted callback
    // so Supabase doesn't drop the student role and bounce to the homepage.
    document.cookie = `tutafy_oauth_role=student; path=/; max-age=600; samesite=lax`
    document.cookie = `tutafy_oauth_next=${encodeURIComponent('/student/dashboard')}; path=/; max-age=600; samesite=lax`
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

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

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60 mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
          <div className="relative flex justify-center"><span className="bg-[#F7F8FA] px-3 text-[12px] text-gray-400">or with email</span></div>
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
