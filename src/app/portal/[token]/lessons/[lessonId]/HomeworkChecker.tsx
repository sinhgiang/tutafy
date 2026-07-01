'use client'

import { useState } from 'react'
import { CheckSquare, Loader2, Sparkles } from 'lucide-react'

export function HomeworkChecker({
  token,
  lessonId,
  homework,
}: {
  token: string
  lessonId: string
  homework: string
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function check() {
    if (!text.trim()) return
    setLoading(true)
    setFeedback('')
    const res = await fetch('/api/ai/homework-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homework_text: text, lesson_id: lessonId, portal_token: token }),
    })
    const data = await res.json()
    setFeedback(data.feedback ?? data.error ?? 'Error')
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-indigo-400" />
        <p className="text-[13px] font-semibold text-gray-900">Submit Homework</p>
      </div>
      <div className="bg-amber-50 rounded-lg p-3">
        <p className="text-[12px] text-amber-700 font-medium mb-1">Assignment:</p>
        <p className="text-[13px] text-amber-900">{homework}</p>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        placeholder="Write your answer here..."
        className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
      />
      <button
        onClick={check}
        disabled={!text.trim() || loading}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {loading ? 'Checking...' : 'Get AI Feedback'}
      </button>
      {feedback && (
        <div className="bg-indigo-50 rounded-lg p-4">
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">AI Feedback</p>
          <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{feedback}</p>
        </div>
      )}
    </div>
  )
}
