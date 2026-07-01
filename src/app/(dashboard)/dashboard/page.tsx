import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, BookOpen, DollarSign, TrendingUp, ArrowRight, Plus, Clock, ChevronUp, ChevronDown, Minus, AlertTriangle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: tutor },
    { count: totalStudents },
    { count: activeStudents },
    { data: lessons },
    { data: recentStudents },
    { data: upcomingLessons },
    { data: activeStudentsFull },
  ] = await Promise.all([
    supabase.from('tutors').select('name').eq('id', user!.id).single(),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('tutor_id', user!.id),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('tutor_id', user!.id).eq('status', 'active'),
    supabase.from('lessons').select('starts_at, price, status').eq('tutor_id', user!.id),
    supabase.from('students').select('id, name, level, status, created_at').eq('tutor_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('lessons').select('id, starts_at, duration_minutes, status, students(name)').eq('tutor_id', user!.id).gte('starts_at', new Date().toISOString()).eq('status', 'scheduled').order('starts_at').limit(5),
    supabase.from('students').select('id, name').eq('tutor_id', user!.id).eq('status', 'active'),
  ])

  const now = new Date()

  // Churn risk: active students with no upcoming lesson in next 21 days
  const next21Days = new Date(now.getTime() + 21 * 86400000).toISOString()
  const { data: upcomingStudentIds } = activeStudentsFull && activeStudentsFull.length > 0
    ? await supabase.from('lessons')
        .select('student_id')
        .eq('tutor_id', user!.id)
        .eq('status', 'scheduled')
        .gte('starts_at', now.toISOString())
        .lte('starts_at', next21Days)
    : { data: [] }

  const bookedIds = new Set((upcomingStudentIds ?? []).map((l: any) => l.student_id))
  const churnRisk = (activeStudentsFull ?? []).filter((s: any) => !bookedIds.has(s.id)).slice(0, 5)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const lessonsThisMonth = lessons?.filter(l => new Date(l.starts_at) >= startOfMonth && l.status !== 'cancelled').length ?? 0
  const revenueThisMonth = lessons?.filter(l => new Date(l.starts_at) >= startOfMonth && l.status === 'completed').reduce((s, l) => s + (l.price ?? 0), 0) ?? 0
  const revenueLastMonth = lessons?.filter(l => new Date(l.starts_at) >= startOfLastMonth && new Date(l.starts_at) < startOfMonth && l.status === 'completed').reduce((s, l) => s + (l.price ?? 0), 0) ?? 0

  const growth = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100) : null

  const firstName = tutor?.name?.split(' ')[0] ?? 'there'

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const LEVEL_COLOR: Record<string, string> = {
    A1: 'bg-slate-100 text-slate-500',
    A2: 'bg-blue-50 text-blue-600',
    B1: 'bg-cyan-50 text-cyan-700',
    B2: 'bg-green-50 text-green-700',
    C1: 'bg-orange-50 text-orange-700',
    C2: 'bg-red-50 text-red-700',
    Native: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/students/new"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors px-4 py-2 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Student
          </Link>
          <Link
            href="/lessons/new"
            className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 transition-colors px-4 py-2 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Schedule Lesson
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Total Students',
            value: totalStudents ?? 0,
            sub: `${activeStudents ?? 0} active`,
            icon: Users,
            accent: 'text-indigo-500',
            ring: 'ring-indigo-100',
            bg: 'bg-indigo-50',
          },
          {
            label: 'Lessons This Month',
            value: lessonsThisMonth,
            sub: 'scheduled + completed',
            icon: BookOpen,
            accent: 'text-emerald-500',
            ring: 'ring-emerald-100',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Revenue This Month',
            value: `$${revenueThisMonth.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
            sub: `$${revenueLastMonth.toFixed(0)} last month`,
            icon: DollarSign,
            accent: 'text-violet-500',
            ring: 'ring-violet-100',
            bg: 'bg-violet-50',
          },
          {
            label: 'Growth',
            value: growth !== null ? `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}%` : '—',
            sub: 'vs last month',
            icon: TrendingUp,
            accent: growth === null ? 'text-gray-400' : growth >= 0 ? 'text-amber-500' : 'text-red-500',
            ring: 'ring-amber-100',
            bg: 'bg-amber-50',
            growthDir: growth,
          },
        ].map(({ label, value, sub, icon: Icon, accent, bg, growthDir }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[28px] font-bold text-gray-900 leading-none tracking-tight">{value}</span>
              {growthDir !== undefined && growthDir !== null && (
                growthDir > 0
                  ? <ChevronUp className="h-4 w-4 text-emerald-500 mb-0.5" />
                  : growthDir < 0
                    ? <ChevronDown className="h-4 w-4 text-red-400 mb-0.5" />
                    : <Minus className="h-4 w-4 text-gray-300 mb-0.5" />
              )}
            </div>
            <p className="text-[12px] text-gray-400 mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Upcoming Lessons */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="text-[13px] font-semibold text-gray-900">Upcoming Lessons</h2>
            </div>
            <Link href="/lessons" className="text-[12px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(upcomingLessons ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-[13px] text-gray-400 mb-2">No upcoming lessons</p>
                <Link href="/lessons/new" className="text-[12px] text-indigo-500 font-semibold hover:underline">
                  Schedule your first lesson →
                </Link>
              </div>
            ) : (upcomingLessons ?? []).map((lesson: any) => {
              const date = new Date(lesson.starts_at)
              const isToday = date.toDateString() === now.toDateString()
              const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString()
              const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              return (
                <div key={lesson.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className={`text-center min-w-[44px] py-1.5 px-2 rounded-lg ${isToday ? 'bg-indigo-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{dayLabel.split(' ')[0]}</p>
                    <p className="text-[16px] font-bold leading-none mt-0.5">
                      {isToday || isTomorrow ? date.getDate() : dayLabel.split(' ')[2] ?? date.getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">
                      {(lesson.students as any)?.name ?? '—'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {lesson.duration_minutes} min
                    </p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isToday ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                    {isToday ? 'Today' : 'Upcoming'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Churn Risk + Recent Students stacked */}
        <div className="col-span-2 space-y-4">

        {/* Churn Risk */}
        {churnRisk.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-100">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-[13px] font-semibold text-gray-900">At Risk ({churnRisk.length})</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {churnRisk.map((s: any) => (
                <Link key={s.id} href={`/students/${s.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-amber-50/50 transition-colors">
                  <p className="text-[13px] font-medium text-gray-900">{s.name}</p>
                  <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">No lesson booked</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Students */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <h2 className="text-[13px] font-semibold text-gray-900">Recent Students</h2>
            </div>
            <Link href="/students" className="text-[12px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentStudents ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-[13px] text-gray-400 mb-2">No students yet</p>
                <Link href="/students/new" className="text-[12px] text-indigo-500 font-semibold hover:underline">
                  Add your first student →
                </Link>
              </div>
            ) : (recentStudents ?? []).map((s: any) => {
              const initials = s.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <Link key={s.id} href={`/students/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-indigo-600">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${LEVEL_COLOR[s.level] ?? 'bg-gray-100 text-gray-500'}`}>
                        {s.level}
                      </span>
                      <span className={`text-[10px] ${s.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        </div>{/* end col-span-2 stack */}
      </div>
    </div>
  )
}
