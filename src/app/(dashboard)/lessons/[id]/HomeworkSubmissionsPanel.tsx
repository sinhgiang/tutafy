'use client'

import { useState } from 'react'
import { MessageSquare, CheckCircle, Loader2, Send } from 'lucide-react'

interface Submission {
  id: string
  content: string
  submitted_at: string
  tutor_feedback: string | null
  feedback_at: string | null
  students: { name: string } | null
}

export function HomeworkSubmissionsPanel({
  lessonId,
  submissions,
}: {
  lessonId: string
  submissions: Submission[]
}) {
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>(
    Object.fromEntries(submissions.map(s => [s.id, s.tutor_feedback ?? '']))
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>(
    Object.fromEntries(submissions.map(s => [s.id, !!s.tutor_feedback]))
  )

  async function saveFeedback(submissionId: string) {
    const feedback = feedbacks[submissionId]?.trim()
    if (!feedback) return
    setSaving(p => ({ ...p, [submissionId]: true }))
    const res = await fetch(`/api/lessons/${lessonId}/homework-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, feedback }),
    })
    setSaving(p => ({ ...p, [submissionId]: false }))
    if (res.ok) setSaved(p => ({ ...p, [submissionId]: true }))
  }

  if (submissions.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-indigo-400" />
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Homework Submissions ({submissions.length})
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {submissions.map(sub => (
          <div key={sub.id} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-gray-900">{sub.students?.name ?? 'Student'}</p>
              <p className="text-[11px] text-gray-400">
                {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl px-4 py-3">
              <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{sub.content}</p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-gray-500 mb-1.5">Your feedback</p>
              <textarea
                value={feedbacks[sub.id] ?? ''}
                onChange={e => {
                  setFeedbacks(p => ({ ...p, [sub.id]: e.target.value }))
                  setSaved(p => ({ ...p, [sub.id]: false }))
                }}
                rows={3}
                placeholder="Write feedback for the student..."
                className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
              />
              <div className="flex justify-end mt-2">
                {saved[sub.id] && !saving[sub.id] ? (
                  <span className="flex items-center gap-1.5 text-[12px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    <CheckCircle className="h-3.5 w-3.5" /> Feedback saved
                  </span>
                ) : (
                  <button
                    onClick={() => saveFeedback(sub.id)}
                    disabled={saving[sub.id] || !feedbacks[sub.id]?.trim()}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-3 py-2 rounded-lg transition-colors"
                  >
                    {saving[sub.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {saving[sub.id] ? 'Saving...' : 'Save feedback'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
