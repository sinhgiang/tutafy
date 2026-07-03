'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'

export default function BroadcastPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentCount, setStudentCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('students').select('id', { count: 'exact' })
        .eq('tutor_id', user.id).eq('status', 'active').not('email', 'is', null)
        .then(({ count }) => setStudentCount(count ?? 0))
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setLoading(true)
    const res = await fetch('/api/messages/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      toast.success(`Sent to ${data.sent} students`)
      setSubject('')
      setMessage('')
    } else {
      toast.error(data.error ?? 'Failed to send')
    }
  }

  return (
    <div className="max-w-[600px] space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Send Announcement</h1>
          <p className="text-[12px] text-gray-400">Sends to {studentCount} active students with email</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Holiday schedule update"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message here..."
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !subject.trim() || !message.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-colors"
        >
          <Send className="h-4 w-4" />
          {loading ? 'Sending...' : `Send to ${studentCount} students`}
        </button>
      </form>
    </div>
  )
}
