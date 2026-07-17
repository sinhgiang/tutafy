'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MonitorPlay, Video, Link2, ExternalLink, Loader2, Check } from 'lucide-react'
import { inferVideoProvider } from '@/lib/video'

type Tab = 'builtin' | 'zoom' | 'external'

export function VideoPlatformPicker({
  lessonId, initialUrl, topic, startTime, duration,
}: {
  lessonId: string
  initialUrl: string | null
  topic: string
  startTime: string
  duration: number
}) {
  const router = useRouter()
  const inferred = inferVideoProvider(initialUrl)
  const initialTab: Tab = inferred.provider === 'zoom' ? 'zoom'
    : (inferred.provider === 'meet' || inferred.provider === 'custom') ? 'external'
    : 'builtin'

  const [tab, setTab] = useState<Tab>(initialTab)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [meetInput, setMeetInput] = useState(inferred.provider === 'meet' || inferred.provider === 'custom' ? (initialUrl ?? '') : '')
  const [loading, setLoading] = useState<string | null>(null)

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setLoading(action)
    try {
      const res = await fetch('/api/lessons/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, action, topic, startTime, duration, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Something went wrong'); return false }
      setUrl(data.url ?? null)
      router.refresh()
      return true
    } catch {
      toast.error('Network error')
      return false
    } finally {
      setLoading(null)
    }
  }

  async function pickBuiltin() {
    setTab('builtin')
    if (url) { if (await call('builtin')) toast.success('Switched to the built-in room') }
  }

  async function createZoom() {
    if (await call('zoom')) toast.success('Zoom meeting created')
  }

  async function saveMeet() {
    const v = meetInput.trim()
    if (!v) { toast.error('Paste a meeting link first'); return }
    if (await call('custom', { url: v })) toast.success('Meeting link saved')
  }

  const TABS: { id: Tab; label: string; icon: typeof Video }[] = [
    { id: 'builtin', label: 'Built-in', icon: MonitorPlay },
    { id: 'zoom', label: 'Zoom', icon: Video },
    { id: 'external', label: 'Google Meet / Link', icon: Link2 },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Video Platform</p>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-gray-50 p-1 rounded-xl">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold py-2 rounded-lg transition-colors ${
              tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Built-in */}
      {tab === 'builtin' && (
        <div className="text-[12px] text-gray-500 leading-relaxed">
          {!url ? (
            <p className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Students join your free built-in video room — no downloads, no time limits.</p>
          ) : (
            <button onClick={pickBuiltin} disabled={loading === 'builtin'}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
              {loading === 'builtin' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MonitorPlay className="h-3.5 w-3.5" />}
              Switch back to the built-in room
            </button>
          )}
        </div>
      )}

      {/* Zoom */}
      {tab === 'zoom' && (
        <div className="space-y-2.5">
          {inferVideoProvider(url).provider === 'zoom' && url ? (
            <>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[12px] text-indigo-500 hover:underline break-all">
                {url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
              <button onClick={createZoom} disabled={loading === 'zoom'}
                className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50">
                {loading === 'zoom' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                Regenerate Zoom meeting
              </button>
            </>
          ) : (
            <button onClick={createZoom} disabled={loading === 'zoom'}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg px-4 py-2 transition-colors disabled:opacity-50">
              {loading === 'zoom' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
              Create Zoom meeting
            </button>
          )}
          <p className="text-[11px] text-gray-400">Auto-creates a scheduled Zoom meeting and shares the link with your student.</p>
        </div>
      )}

      {/* Google Meet / custom link */}
      {tab === 'external' && (
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input
              value={meetInput}
              onChange={e => setMeetInput(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="flex-1 text-[12px] px-3 py-2 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            />
            <button onClick={saveMeet} disabled={loading === 'custom'}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg px-4 py-2 transition-colors disabled:opacity-50">
              {loading === 'custom' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Paste a Google Meet link (or any meeting URL). Your student will use this to join.</p>
        </div>
      )}
    </div>
  )
}
