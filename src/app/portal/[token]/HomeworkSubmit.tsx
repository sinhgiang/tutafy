'use client'

import { useState, useEffect } from 'react'
import { Send, CheckCircle, Loader2, MessageSquare } from 'lucide-react'

interface Submission {
  content: string
  tutor_feedback: string | null
  feedback_at: string | null
}

export function HomeworkSubmit({
  token, lessonId, homework,
}: {
  token: string
  lessonId: string
  homework: string
}) {
  const [content, setContent] = useState('')
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch(`/api/portal/${token}/homework?lesson_id=${lessonId}`)
      .then(r => r.json())
      .then(d => {
        if (d.submission?.content) setSubmission(d.submission)
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [token, lessonId])

  async function submit() {
    if (!content.trim()) return
    setLoading(true)
    const res = await fetch(`/api/portal/${token}/homework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, content }),
    })
    setLoading(false)
    if (res.ok) setSubmission({ content, tutor_feedback: null, feedback_at: null })
  }

  if (checking) return null

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="h-3.5 w-3.5 text-indigo-400" />
        <p className="text-[12px] font-semibold text-gray-700">Submit your homework</p>
      </div>

      {submission ? (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <p className="text-[12px] font-semibold text-emerald-700">Submitted!</p>
            </div>
            <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">{submission.content}</p>
          </div>
          {submission.tutor_feedback && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <p className="text-[12px] font-semibold text-indigo-700">Tutor feedback</p>
              </div>
              <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{submission.tutor_feedback}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            placeholder="Write your homework here..."
            className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
          />
          <button
            onClick={submit}
            disabled={loading || !content.trim()}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {loading ? 'Submitting...' : 'Submit homework'}
          </button>
        </div>
      )}
    </div>
  )
}
