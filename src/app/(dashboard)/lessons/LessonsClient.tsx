'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, Video, CheckSquare, Square, DollarSign, CheckCircle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-600',
  completed: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-red-50 text-red-500',
  no_show: 'bg-gray-100 text-gray-400',
}

interface Lesson {
  id: string
  starts_at: string
  duration_minutes: number
  status: string
  payment_status: string | null
  price: number | null
  zoom_link: string | null
  meet_link: string | null
  students: { name: string; level: string | null } | null
}

export function LessonsClient({ upcoming, past }: { upcoming: Lesson[]; past: Lesson[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const allLessons = [...upcoming, ...past]

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearSelection() { setSelected(new Set()) }

  async function bulkAction(action: 'mark_paid' | 'mark_completed') {
    if (selected.size === 0) return
    setBulkLoading(true)
    const res = await fetch('/api/lessons/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_ids: Array.from(selected), action }),
    })
    const data = await res.json()
    setBulkLoading(false)
    if (res.ok) {
      toast.success(`Updated ${data.updated} lesson${data.updated !== 1 ? 's' : ''}`)
      clearSelection()
      // Refresh the page to show updated data
      window.location.reload()
    } else {
      toast.error(data.error ?? 'Failed to update lessons')
    }
  }

  const selectedCount = selected.size

  return (
    <div className="space-y-6">
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-xl">
          <span className="text-[13px] font-semibold">{selectedCount} selected</span>
          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={() => bulkAction('mark_paid')}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 text-[12px] font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
          >
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
            Mark paid
          </button>
          <button
            onClick={() => bulkAction('mark_completed')}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 text-[12px] font-semibold bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
          >
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
            Mark completed
          </button>
          <button onClick={clearSelection} className="p-1 rounded-lg hover:bg-gray-700 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      )}

      {allLessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20">
          <p className="text-[15px] font-semibold text-gray-400">No lessons yet</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming</p>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {upcoming.map(l => (
                  <LessonRow key={l.id} lesson={l} isSelected={selected.has(l.id)} onToggle={() => toggle(l.id)} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Past</p>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {past.map(l => (
                  <LessonRow key={l.id} lesson={l} isSelected={selected.has(l.id)} onToggle={() => toggle(l.id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function LessonRow({ lesson, isSelected, onToggle }: { lesson: Lesson; isSelected: boolean; onToggle: () => void }) {
  const start = new Date(lesson.starts_at)
  const now = new Date()
  const isToday = start.toDateString() === now.toDateString()

  return (
    <div className="flex items-center gap-2 hover:bg-gray-50/60 transition-colors">
      <button
        onClick={onToggle}
        className="flex-shrink-0 pl-4 py-4 text-gray-300 hover:text-indigo-500 transition-colors"
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected
          ? <CheckSquare className="h-4 w-4 text-indigo-500" />
          : <Square className="h-4 w-4" />
        }
      </button>
      <Link href={`/lessons/${lesson.id}`} className="flex flex-1 items-center gap-4 pr-5 py-4 min-w-0">
        <div className={`text-center w-12 py-1.5 rounded-lg flex-shrink-0 ${isToday ? 'bg-indigo-500' : 'bg-gray-50'}`}>
          <p className={`text-[9px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-200' : 'text-gray-400'}`}>
            {start.toLocaleDateString('en', { month: 'short' })}
          </p>
          <p className={`text-[18px] font-bold leading-none mt-0.5 ${isToday ? 'text-white' : 'text-gray-800'}`}>
            {start.getDate()}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900">{lesson.students?.name ?? 'Unknown'}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Clock className="h-3 w-3" />
              {start.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="text-[11px] text-gray-400">{lesson.duration_minutes} min</span>
            {(lesson.zoom_link || lesson.meet_link) && (
              <span className="flex items-center gap-1 text-[11px] text-indigo-500">
                <Video className="h-3 w-3" /> Link
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {lesson.price && <span className="text-[13px] font-semibold text-gray-700">${lesson.price}</span>}
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[lesson.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {lesson.status}
          </span>
        </div>
      </Link>
    </div>
  )
}
