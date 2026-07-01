'use client'

import { useState } from 'react'
import { Star, CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  lessonId: string
  portalToken: string
}

export function ReviewForm({ lessonId, portalToken }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!rating) return
    setLoading(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal_token: portalToken, lesson_id: lessonId, rating, comment }),
    })
    if (res.ok) setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 py-2">
        <CheckCircle className="h-4 w-4" />
        <span className="text-[12px] font-medium">Review submitted. Thank you!</span>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Rate this lesson</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110">
            <Star className={`h-6 w-6 transition-colors ${
              s <= (hovered || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
            }`} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share what you learned... (optional)"
            rows={2}
            className="w-full text-[12px] px-3 py-2 rounded-lg border border-gray-200 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
          />
          <button onClick={submit} disabled={loading}
            className="flex items-center gap-2 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-4 py-2 rounded-lg transition-colors">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? 'Saving...' : 'Submit review'}
          </button>
        </>
      )}
    </div>
  )
}
