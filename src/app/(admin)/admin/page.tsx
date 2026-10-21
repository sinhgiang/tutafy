import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { loadOverview, type WeekCount } from '@/lib/platform-overview'
import { loadPaying } from '@/lib/customers-data'
import { planBadgeClass, planLabel } from '@/lib/buyers'
import { getAdminT } from '@/lib/admin-lang'
import { readErrorText, statusText, type AdminT } from '@/lib/admin-i18n'
import { Users, GraduationCap, BookOpen, TrendingUp, UserCheck, Clock, UserRoundCheck, BadgeCheck, UserRound, Repeat, ShoppingBag, Percent, Sparkles, CalendarCheck, UserPlus, Wallet } from 'lucide-react'

export const dynamic = 'force-dynamic'

// The owner's first page (T-0699): who pays, how many moved up from the free plan, how the tutors use Tutafy; the platform-wide
// numbers of T-0680 stay below. Every word comes from the admin translation table (src/lib/admin-i18n.ts), in the language the
// owner picked with the EN | VI switch (English by default).

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  indigo: 'bg-indigo-100 text-indigo-600',
}

const show = (v: number | null) => (v === null ? '—' : v.toLocaleString('en-US'))
const percent = (part: number | null, whole: number | null) => (part === null || !whole ? null : Math.round((part / whole) * 100))
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const weekLabel = (t: AdminT, weekStart: string, current: boolean) =>
  current ? t('overview.thisWeek') : new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function WeeklyChart({ weeks, t }: { weeks: WeekCount[]; t: AdminT }) {
  const max = Math.max(1, ...weeks.map(w => w.count))
  const newestFirst = [...weeks].reverse()
  return (
    <ul className="px-5 py-4 space-y-2" data-testid="weekly-signups">
      {newestFirst.map((w, i) => (
        <li key={w.weekStart} className="flex items-center gap-3 text-sm" data-week={w.weekStart}>
          <span className="w-20 shrink-0 text-gray-500">{weekLabel(t, w.weekStart, i === 0)}</span>
          <span className="flex-1 h-3 bg-gray-50 rounded-full overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${(w.count / max) * 100}%` }} />
          </span>
          <span className="w-10 shrink-0 text-right font-medium text-gray-900" data-count>{w.count}</span>
        </li>
      ))}
    </ul>
  )
}

function Card({ id, label, value, hint, icon: Icon, color = 'indigo' }: { id: string; label: string; value: string; hint: string; icon: typeof Users; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100" data-card={id}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p data-value className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>
  )
}

export default async function AdminOverviewPage() {
  // Own check, before any query: this page reads every tutor, student and lesson with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

  const admin = createAdminClient()
  const [d, paying] = await Promise.all([loadOverview(admin), loadPaying(admin)])
  const c = d.customers
  const a = c?.activity

  const stats = [
    { id: 'tutors', label: t('overview.tutorsTotal'), value: d.tutors, icon: Users, color: 'blue', desc: t('overview.tutorsTotalHint') },
    { id: 'active-tutors', label: t('overview.activeTutors'), value: d.activeTutors, icon: UserRoundCheck, color: 'green', desc: percent(d.activeTutors, d.tutors) === null ? t('overview.activeTutorsHint') : t('overview.activeTutorsHintPct', { pct: percent(d.activeTutors, d.tutors)! }) },
    { id: 'activated-tutors', label: t('overview.activatedTutors'), value: d.activatedTutors, icon: BadgeCheck, color: 'purple', desc: percent(d.activatedTutors, d.tutors) === null ? t('overview.activatedTutorsHint') : t('overview.activatedTutorsHintPct', { pct: percent(d.activatedTutors, d.tutors)! }) },
    { id: 'new-tutors', label: t('overview.newTutors'), value: d.newTutors, icon: TrendingUp, color: 'orange', desc: t('overview.newTutorsHint') },
    { id: 'total-students', label: t('overview.studentsTotal'), value: d.totalStudents, icon: GraduationCap, color: 'green', desc: t('overview.studentsTotalHint') },
    { id: 'real-students', label: t('overview.studentsReal'), value: d.realStudents, icon: UserRound, color: 'blue', desc: t('overview.studentsRealHint') },
    { id: 'self-students', label: t('overview.studentsSelf'), value: d.selfAddedStudents, icon: Repeat, color: 'orange', desc: t('overview.studentsSelfHint') },
    { id: 'lessons', label: t('overview.lessonsTotal'), value: d.totalLessons, icon: BookOpen, color: 'purple', desc: t('overview.lessonsTotalHint') },
  ]

  const failedTables = [...new Set([...d.failedTables, ...(paying.failed ? ['tutors'] : [])])]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('overview.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('overview.subtitle')}</p>
      </div>

      {failedTables.length > 0 && (
        <div data-testid="overview-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {readErrorText(t, failedTables)}
        </div>
      )}
      {d.truncated && (
        <div data-testid="overview-truncated" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {t('overview.truncated')}
        </div>
      )}

      {/* 1. who pays */}
      <section className="space-y-4" aria-labelledby="paying-title">
        <h2 id="paying-title" className="text-lg font-semibold text-gray-900">{t('overview.paying')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Card id="pro" label={t('overview.pro')} value={paying.failed ? '—' : show(paying.pro)} hint={t('overview.proHint')} icon={ShoppingBag} />
          <Card id="academy" label={t('overview.academy')} value={paying.failed ? '—' : show(paying.academy)} hint={t('overview.academyHint')} icon={ShoppingBag} color="purple" />
          <Card id="free" label={t('overview.free')} value={c ? show(c.free) : '—'} hint={t('overview.freeHint')} icon={Users} color="blue" />
          <Card id="moved-up" label={t('overview.movedUp')} value={c && c.movedUpPercent !== null ? `${c.movedUpPercent}%` : '—'}
            hint={c ? t('overview.movedUpHint', { paying: c.paying, tutors: c.tutors.toLocaleString('en-US') }) : t('common.unreadable')} icon={Percent} color="green" />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <Card id="new-paying-7" label={t('overview.new7')} value={paying.failed ? '—' : show(paying.newPaying.d7)} hint={t('overview.new7Hint')} icon={Sparkles} color="orange" />
          <Card id="new-paying-30" label={t('overview.new30')} value={paying.failed ? '—' : show(paying.newPaying.d30)} hint={t('overview.new30Hint')} icon={Sparkles} color="orange" />
        </div>
        {!paying.failed && (paying.newPaying.datedBySignup > 0 || paying.datesFailedTables.length > 0) && (
          <p data-testid="date-note" className="text-xs text-gray-500">
            {paying.datesFailedTables.length > 0
              ? t('overview.dateNoteTables')
              : t('overview.dateNoteCount', { n: paying.newPaying.datedBySignup })}
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">{t('overview.listTitle')}</h3>
            <span className="text-xs text-gray-400">{t('overview.listHint')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="paying-list">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">{t('common.tutor')}</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.plan')}</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">{t('overview.colBought')}</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.students')}</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">{t('common.lessons')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paying.customers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-6">{paying.failed ? t('overview.listUnreadable') : t('overview.listEmpty')}</td></tr>
                )}
                {paying.customers.map(p => (
                  <tr key={p.id} data-customer={p.id}>
                    <td className="px-5 py-3">
                      <Link href={`/super-admin/people/${p.id}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{p.name}</Link>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </td>
                    <td className="px-5 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(p.plan)}`}>{planLabel(p.plan)}</span></td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">{dayLabel(p.boughtOn)}{!p.boughtDateKnown && <span className="text-xs text-gray-400" title={t('overview.signupDateTitle')}>{t('overview.signupDateTag')}</span>}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{p.students}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{p.lessons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paying.listCut && <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-50">{t('overview.listCut')}</p>}
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-start gap-3 text-sm text-indigo-900">
          <Wallet className="h-4 w-4 mt-0.5 shrink-0 text-indigo-500" />
          <p>
            <strong>{t('overview.incomeLead')}</strong>{t('overview.incomeMid')}<Link href="/admin/revenue" className="underline font-medium">{t('nav.revenue')}</Link>{t('overview.incomeTail')}
          </p>
        </div>
      </section>

      {/* 2. how they use it */}
      <section className="space-y-4" aria-labelledby="activity-title">
        <h2 id="activity-title" className="text-lg font-semibold text-gray-900">{t('overview.usage')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Card id="used-7" label={t('overview.used7')} value={a ? show(a.usedTutors7) : '—'} hint={t('overview.used7Hint')} icon={UserRoundCheck} color="green" />
          <Card id="booked-7" label={t('overview.booked7')} value={a ? show(a.lessonsBooked7) : '—'} hint={t('overview.booked7Hint')} icon={CalendarCheck} />
          <Card id="new-real-7" label={t('overview.newReal7')} value={a ? show(a.newWithRealStudent7) : '—'} hint={a ? t('overview.newReal7Hint', { n: a.newTutors7 }) : t('common.unreadable')} icon={UserPlus} color="orange" />
          <Card id="new-real-30" label={t('overview.newReal30')} value={a ? show(a.newWithRealStudent30) : '—'} hint={a ? t('overview.newReal30Hint', { n: a.newTutors30 }) : t('common.unreadable')} icon={UserPlus} color="orange" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-x-2 gap-y-1 flex-wrap">
            <TrendingUp className="h-4 w-4 text-gray-400 shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm whitespace-nowrap">{t('overview.weekly')}</h3>
            <span className="text-xs text-gray-400">{t('overview.weeklyHint')}</span>
          </div>
          {d.weekly ? <WeeklyChart weeks={d.weekly} t={t} /> : <p className="text-sm text-gray-400 text-center py-6">{t('overview.weeklyUnreadable')}</p>}
        </div>
      </section>

      {/* 3. the whole platform (T-0680) */}
      <section className="space-y-4" aria-labelledby="platform-title">
        <h2 id="platform-title" className="text-lg font-semibold text-gray-900">{t('overview.platform')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(({ id, label, value, icon: Icon, color, desc }) => (
            <div key={id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100" data-stat={id}>
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-sm text-gray-500">{label}</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p data-value className="text-3xl font-bold text-gray-900">{show(value)}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">{t('overview.recentTutors')}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {d.recentTutors.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">{t('overview.noTutors')}</p>
              )}
              {d.recentTutors.map(tu => (
                <div key={tu.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tu.name}</p>
                    <p className="text-xs text-gray-400 truncate">{tu.email}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{dayLabel(tu.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">{t('overview.recentLessons')}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {d.recentLessons.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">{t('overview.noLessons')}</p>
              )}
              {d.recentLessons.map((l) => (
                <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {l.tutors?.name ?? '—'} → {l.students?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">{dayLabel(l.starts_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    l.status === 'completed' ? 'bg-green-100 text-green-700' :
                    l.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{statusText(t, l.status)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
