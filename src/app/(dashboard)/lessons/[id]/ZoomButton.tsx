'use client'
import { useState } from 'react'
import { Video } from 'lucide-react'
import { toast } from 'sonner'

export function ZoomButton({ lessonId, topic, startTime, duration }: { lessonId: string; topic: string; startTime: string; duration: number }) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  async function create() {
    setLoading(true)
    const res = await fetch('/api/lessons/zoom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, topic, startTime, duration }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.url) { setUrl(data.url); toast.success('Zoom meeting created!') }
    else toast.error('Zoom not configured — add ZOOM credentials in settings')
  }

  if (url) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-blue-500 hover:underline">{url}</a>
  return (
    <button onClick={create} disabled={loading}
      className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50">
      <Video className="h-3.5 w-3.5" />
      {loading ? 'Creating...' : 'Create Zoom Meeting'}
    </button>
  )
}
