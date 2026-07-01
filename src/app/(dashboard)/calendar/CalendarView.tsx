'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-indigo-400',
  completed: 'bg-emerald-400',
  cancelled: 'bg-red-400',
  no_show: 'bg-gray-300',
}

interface Lesson {
  id: string
  starts_at: string
  duration_minutes: number
  status: string
  price?: number
  students?: { name?: string } | null
}

export default function CalendarView({ lessons }: { lessons: Lesson[] }) {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstDay.getDay()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const lessonsByDay: Record<number, Lesson[]> = {}
  lessons.forEach(l => {
    const d = new Date(l.starts_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!lessonsByDay[day]) lessonsByDay[day] = []
      lessonsByDay[day].push(l)
    }
  })

  const cells = Array.from({ length: startWeekday + daysInMonth }, (_, i) => {
    if (i < startWeekday) return null
    return i - startWeekday + 1
  })
  while (cells.length % 7 !== 0) cells.push(null)

  const [selected, setSelected] = useState<number | null>(null)
  const selectedLessons = selected ? (lessonsByDay[selected] ?? []) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Calendar</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Your lesson schedule</p>
        </div>
        <Link href="/lessons/new"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg">
          <Plus className="h-3.5 w-3.5" /> Schedule Lesson
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-500" />
          </button>
          <p className="text-[14px] font-semibold text-gray-900">{MONTHS[month]} {year}</p>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-50">
          {DAYS.map(d => (
            <div key={d} className="text-center py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = day !== null && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
            const dayLessons = day ? (lessonsByDay[day] ?? []) : []
            const isSelected = day === selected

            return (
              <div
                key={idx}
                onClick={() => day && setSelected(day === selected ? null : day)}
                className={`min-h-[80px] p-2 border-b border-r border-gray-50 last:border-r-0 cursor-pointer transition-colors
                  ${!day ? 'bg-gray-50/40' : isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50/60'}`}
              >
                {day && (
                  <>
                    <p className={`text-[12px] font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-indigo-500 text-white' : 'text-gray-700'
                    }`}>{day}</p>
                    <div className="space-y-0.5">
                      {dayLessons.slice(0, 3).map(l => (
                        <div key={l.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${
                          l.status === 'scheduled' ? 'bg-indigo-400' :
                          l.status === 'completed' ? 'bg-emerald-400' :
                          l.status === 'cancelled' ? 'bg-red-400' : 'bg-gray-300'
                        }`}>
                          <span className="truncate">{(l.students as any)?.name?.split(' ')[0] ?? 'Lesson'}</span>
                        </div>
                      ))}
                      {dayLessons.length > 3 && (
                        <p className="text-[10px] text-gray-400 pl-1">+{dayLessons.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            {MONTHS[month]} {selected}
          </p>
          {selectedLessons.length === 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-gray-400">No lessons this day</p>
              <Link href={`/lessons/new`}
                className="text-[12px] text-indigo-500 hover:underline font-medium">
                + Add lesson
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedLessons.map(l => {
                const start = new Date(l.starts_at)
                return (
                  <Link key={l.id} href={`/lessons/${l.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${STATUS_DOT[l.status] ?? 'bg-gray-200'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900">{(l.students as any)?.name ?? 'Unknown'}</p>
                      <p className="text-[11px] text-gray-400">
                        {start.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })} · {l.duration_minutes} min
                      </p>
                    </div>
                    <div className="text-right">
                      {l.price && <p className="text-[12px] font-semibold text-gray-700">${l.price}</p>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        l.status === 'scheduled' ? 'bg-indigo-50 text-indigo-500' :
                        l.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400'
                      }`}>{l.status}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-gray-400">
        {Object.entries({ scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled' }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${STATUS_DOT[k]}`} />
            {v}
          </div>
        ))}
      </div>
    </div>
  )
}
