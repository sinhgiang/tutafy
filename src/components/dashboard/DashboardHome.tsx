'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Search, Play, MoreVertical, Paperclip, FileText, Video, Users, User,
  ChevronRight, AlertTriangle, Calendar, CreditCard, ListTodo, ArrowUpRight,
} from 'lucide-react'

export type LessonRow = {
  id: string
  starts_at: string
  duration_minutes: number
  status: string
  is_group: boolean
  group_max_students: number
  attachments: number
  docs: number
  hasVideo: boolean
  student: { name: string; level: string | null; avatar_url: string | null } | null
}

export type AtRiskRow = {
  id: string
  name: string
  avatar_url: string | null
  level: string | null
  reason: string
  since: string
}

export type ReminderRow = {
  id: string
  kind: 'lesson' | 'payment' | 'task'
  title: string
  when: string
  tag: string
  href: string
}

export type DashboardData = {
  firstName: string
  dateLabel: string
  nextLessonHref: string | null
  lessons: { upcoming: LessonRow[]; past: LessonRow[]; cancelled: LessonRow[] }
  atRisk: AtRiskRow[]
  reminders: ReminderRow[]
  week: { labels: string[]; lessons: number[]; revenue: number[] }
  weekTotalLessons: number
  currencySymbol: string
}

const LEVEL_COLOR: Record<string, string> = {
  A1: 'bg-slate-100 text-slate-500',
  A2: 'bg-blue-50 text-blue-600',
  B1: 'bg-cyan-50 text-cyan-700',
  B2: 'bg-green-50 text-green-700',
  C1: 'bg-orange-50 text-orange-700',
  C2: 'bg-red-50 text-red-700',
  Native: 'bg-purple-50 text-purple-700',
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ name, url, size = 28 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover flex-shrink-0 ring-2 ring-white" style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 ring-2 ring-white" style={{ width: size, height: size }}>
      <span className="font-bold text-indigo-600" style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
    </div>
  )
}

function fmtTimeRange(startIso: string, minutes: number) {
  const start = new Date(startIso)
  const end = new Date(start.getTime() + minutes * 60000)
  const f = (d: Date) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${f(start)} - ${f(end)}`
}

function lessonType(l: LessonRow): { label: string; icon: typeof Video } {
  if (l.is_group) return { label: 'Group lesson', icon: Users }
  if (l.hasVideo) return { label: 'Meeting', icon: Video }
  return { label: 'Lesson', icon: User }
}

/* ─────────────────────────  Lessons panel  ───────────────────────── */

function LessonItem({ l }: { l: LessonRow }) {
  const d = new Date(l.starts_at)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const day = d.getDate()
  const type = lessonType(l)
  const extraStudents = l.is_group ? Math.max(0, l.group_max_students - 1) : 0
  const title = l.is_group
    ? `Group class${l.student ? ` with ${l.student.name}` : ''}`
    : l.student?.name ?? 'Lesson'

  return (
    <Link
      href="/lessons"
      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
    >
      {/* Date */}
      <div className="text-center min-w-[42px]">
        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide leading-none">{weekday}</p>
        <p className="text-[22px] font-extrabold text-gray-900 leading-none mt-1">{day}</p>
      </div>

      {/* Time + type */}
      <div className="min-w-[132px] hidden sm:block">
        <p className="text-[12.5px] font-medium text-gray-700 tabular-nums">{fmtTimeRange(l.starts_at, l.duration_minutes)}</p>
        <p className="text-[12px] text-gray-400 flex items-center gap-1 mt-1">
          <type.icon className="h-3.5 w-3.5" />
          {type.label}
        </p>
      </div>

      {/* Title + attendee */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-900 truncate">{title}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {l.student && <Avatar name={l.student.name} url={l.student.avatar_url} size={22} />}
          {l.student && (
            <span className="text-[12px] text-gray-500 truncate">
              {l.student.name}{extraStudents > 0 && <span className="text-gray-400"> +{extraStudents}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className="flex items-center gap-3 text-gray-400">
        {l.attachments > 0 && (
          <span className="flex items-center gap-1 text-[12px]"><Paperclip className="h-3.5 w-3.5" />{l.attachments}</span>
        )}
        {l.docs > 0 && (
          <span className="flex items-center gap-1 text-[12px]"><FileText className="h-3.5 w-3.5" />{l.docs}</span>
        )}
        <MoreVertical className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </Link>
  )
}

function LessonsPanel({ data, query }: { data: DashboardData; query: string }) {
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')
  const list = data.lessons[tab]
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(l => {
      const t = lessonType(l).label.toLowerCase()
      return (l.student?.name.toLowerCase().includes(q)) || t.includes(q)
    })
  }, [list, query])

  const TABS: { id: typeof tab; label: string }[] = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
    { id: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <h2 className="text-[16px] font-bold text-gray-900">Lessons</h2>
        <div className="flex items-center gap-1 ml-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link href="/lessons" className="ml-auto text-[12.5px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5">
          View more <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-gray-50 border-t border-gray-50">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-[13px] text-gray-400 mb-2">
              {query ? 'No lessons match your search' : `No ${tab} lessons`}
            </p>
            {tab === 'upcoming' && !query && (
              <Link href="/lessons/new" className="text-[12.5px] text-indigo-500 font-semibold hover:underline">
                Schedule a lesson →
              </Link>
            )}
          </div>
        ) : filtered.map(l => <LessonItem key={l.id} l={l} />)}
      </div>
    </div>
  )
}

/* ─────────────────────────  At-risk (right, top)  ───────────────────────── */

function AtRiskPanel({ rows }: { rows: AtRiskRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold text-gray-900">At risk</h2>
          {rows.length > 0 && (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">{rows.length}</span>
          )}
        </div>
        <Link href="/students" className="text-[12.5px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 pb-8 pt-2 text-center">
          <div className="w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-[13px] text-gray-400">Every active student has an upcoming lesson booked. Nice work.</p>
        </div>
      ) : (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {rows.slice(0, 3).map(s => (
            <div key={s.id} className="rounded-xl border border-gray-100 p-3.5">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} url={s.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-gray-900 truncate">{s.name}</p>
                  {s.level && (
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 ${LEVEL_COLOR[s.level] ?? 'bg-gray-100 text-gray-500'}`}>
                      {s.level}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-[12px] text-gray-400 mt-2.5">{s.reason}</p>
              <Link
                href={`/students/${s.id}`}
                className="mt-3 block w-full text-center text-[12.5px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-lg py-2"
              >
                Reach out
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────  Analytics (bottom, left)  ───────────────────────── */

function AnalyticsPanel({ data }: { data: DashboardData }) {
  const [metric, setMetric] = useState<'lessons' | 'revenue'>('lessons')
  const [hover, setHover] = useState<number | null>(null)

  const values = metric === 'lessons' ? data.week.lessons : data.week.revenue
  const max = Math.max(...values, 1)
  const W = 560, H = 190, padX = 16, padY = 16
  const innerW = W - padX * 2, innerH = H - padY * 2
  const n = values.length
  const xOf = (i: number) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yOf = (v: number) => padY + innerH - (v / max) * innerH

  const linePath = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${xOf(n - 1).toFixed(1)} ${(padY + innerH).toFixed(1)} L ${xOf(0).toFixed(1)} ${(padY + innerH).toFixed(1)} Z`

  const peak = values.indexOf(Math.max(...values))
  const active = hover ?? peak
  const total = values.reduce((s, v) => s + v, 0)
  const fmt = (v: number) => metric === 'revenue' ? `${data.currencySymbol}${v.toLocaleString('en-US')}` : `${v}`

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[16px] font-bold text-gray-900">Analytics</h2>
        <Link href="/reports" className="text-[12.5px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5">
          View more <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="text-[13px] text-gray-400 mb-3">
        {metric === 'lessons' ? 'Lessons' : 'Revenue'} this week:{' '}
        <span className="font-semibold text-gray-700">{metric === 'revenue' ? `${data.currencySymbol}${total.toLocaleString('en-US')}` : total}</span>
      </p>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6366f1" stopOpacity="0.28" />
              <stop offset="1" stopColor="#6366f1" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {gridLines.map((g, i) => (
            <line key={i} x1={padX} x2={W - padX} y1={padY + innerH * g} y2={padY + innerH * g}
              stroke="#f1f2f6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={areaPath} fill="url(#dashArea)" />
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {/* Active marker */}
          <line x1={xOf(active)} x2={xOf(active)} y1={padY} y2={padY + innerH} stroke="#c7c9d9" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          {values.map((v, i) => (
            <circle
              key={i}
              cx={xOf(i)} cy={yOf(v)} r={i === active ? 5 : 3.5}
              fill="#fff" stroke="#6366f1" strokeWidth={i === active ? 3 : 2}
              vectorEffect="non-scaling-stroke"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </svg>
        {/* Tooltip bubble on active point */}
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${(xOf(active) / W) * 100}%`, top: `${(yOf(values[active]) / H) * 100}%`, marginTop: -8 }}
        >
          <div className="bg-indigo-500 text-white text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap shadow-sm">
            {fmt(values[active])} {metric === 'lessons' ? 'lessons' : ''}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-2 px-2">
        {data.week.labels.map((lb, i) => (
          <span key={i} className={`text-[11px] ${i === active ? 'font-bold text-gray-700' : 'text-gray-400'}`}>{lb}</span>
        ))}
      </div>

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-gray-50">
        <button
          onClick={() => setMetric('lessons')}
          className={`text-[12.5px] font-semibold transition-colors ${metric === 'lessons' ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Lessons
        </button>
        <button
          onClick={() => setMetric('revenue')}
          className={`text-[12.5px] font-semibold transition-colors ${metric === 'revenue' ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Revenue
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────  Reminders (bottom, right)  ───────────────────────── */

const REMINDER_META: Record<ReminderRow['kind'], { icon: typeof Video; tagClass: string }> = {
  lesson: { icon: Video, tagClass: 'bg-indigo-50 text-indigo-600' },
  payment: { icon: CreditCard, tagClass: 'bg-amber-50 text-amber-600' },
  task: { icon: ListTodo, tagClass: 'bg-emerald-50 text-emerald-600' },
}

function RemindersPanel({ rows }: { rows: ReminderRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-gray-900">Reminders</h2>
        <Link href="/calendar" className="text-[12.5px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5">
          View more <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-11 h-11 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <ListTodo className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-[13px] text-gray-400">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {rows.map(r => {
            const meta = REMINDER_META[r.kind]
            return (
              <Link key={r.id} href={r.href} className="group flex items-center gap-3 py-2.5 hover:bg-gray-50/70 -mx-2 px-2 rounded-lg transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <meta.icon className="h-4 w-4 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-gray-900 truncate">{r.title}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{r.when}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.tagClass}`}>{r.tag}</span>
                <span className="w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-indigo-400 transition-colors flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────  Page shell  ───────────────────────── */

export function DashboardHome({ data }: { data: DashboardData }) {
  const [query, setQuery] = useState('')
  const startHref = data.nextLessonHref ?? '/lessons/new'
  const startExternal = startHref.startsWith('http')

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex-shrink-0">
          <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Hello, {data.firstName} 👋</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{data.dateLabel}</p>
        </div>

        <div className="flex items-center gap-2.5 md:ml-auto w-full md:w-auto">
          <div className="relative flex-1 md:w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search lessons"
              className="w-full h-10 pl-9 pr-3 text-[13px] bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-shadow placeholder:text-gray-400"
            />
          </div>
          {startExternal ? (
            <a
              href={startHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-10 px-5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-xl whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" /> Start lesson
            </a>
          ) : (
            <Link
              href={startHref}
              className="flex items-center gap-1.5 h-10 px-5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-xl whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" /> Start lesson
            </Link>
          )}
        </div>
      </div>

      {/* Row 1: Lessons + At risk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <LessonsPanel data={data} query={query} />
        </div>
        <div className="lg:col-span-4">
          <AtRiskPanel rows={data.atRisk} />
        </div>
      </div>

      {/* Row 2: Analytics + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        <div className="lg:col-span-5">
          <AnalyticsPanel data={data} />
        </div>
        <div className="lg:col-span-7">
          <RemindersPanel rows={data.reminders} />
        </div>
      </div>
    </div>
  )
}
