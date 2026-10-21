import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { loadOverview, type WeekCount } from '@/lib/platform-overview'
import { loadPaying } from '@/lib/customers-data'
import { planBadgeClass, planLabel } from '@/lib/buyers'
import { readErrorMessage } from '@/lib/read-errors'
import { Users, GraduationCap, BookOpen, TrendingUp, UserCheck, Clock, UserRoundCheck, BadgeCheck, UserRound, Repeat, ShoppingBag, Percent, Sparkles, CalendarCheck, UserPlus, Wallet } from 'lucide-react'

export const dynamic = 'force-dynamic'

// The owner's first page (T-0699): who pays, how many moved up from the free plan, how the tutors use Tutafy; the platform-wide
// numbers of T-0680 stay below. The owner reads Vietnamese, so the words of this page are Vietnamese.

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
const weekLabel = (weekStart: string, current: boolean) =>
  current ? 'Tuần này' : new Date(`${weekStart}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

function WeeklyChart({ weeks }: { weeks: WeekCount[] }) {
  const max = Math.max(1, ...weeks.map(w => w.count))
  const newestFirst = [...weeks].reverse()
  return (
    <ul className="px-5 py-4 space-y-2" data-testid="weekly-signups">
      {newestFirst.map((w, i) => (
        <li key={w.weekStart} className="flex items-center gap-3 text-sm" data-week={w.weekStart}>
          <span className="w-20 shrink-0 text-gray-500">{weekLabel(w.weekStart, i === 0)}</span>
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

  const admin = createAdminClient()
  const [d, paying] = await Promise.all([loadOverview(admin), loadPaying(admin)])
  const c = d.customers
  const a = c?.activity

  const stats = [
    { id: 'tutors', label: 'Tổng số gia sư', value: d.tutors, icon: Users, color: 'blue', desc: 'Đã đăng ký' },
    { id: 'active-tutors', label: 'Gia sư có học sinh thật', value: d.activeTutors, icon: UserRoundCheck, color: 'green', desc: percent(d.activeTutors, d.tutors) === null ? 'Có buổi học với một học sinh thật' : `${percent(d.activeTutors, d.tutors)}% gia sư có buổi học với học sinh thật` },
    { id: 'activated-tutors', label: 'Gia sư đã dạy xong một buổi', value: d.activatedTutors, icon: BadgeCheck, color: 'purple', desc: percent(d.activatedTutors, d.tutors) === null ? 'Có một buổi học hoàn thành' : `${percent(d.activatedTutors, d.tutors)}% gia sư có một buổi học hoàn thành` },
    { id: 'new-tutors', label: 'Gia sư mới trong 30 ngày', value: d.newTutors, icon: TrendingUp, color: 'orange', desc: 'Đăng ký 30 ngày qua' },
    { id: 'total-students', label: 'Tổng số học sinh', value: d.totalStudents, icon: GraduationCap, color: 'green', desc: 'Thật và tự thêm' },
    { id: 'real-students', label: 'Học sinh thật', value: d.realStudents, icon: UserRound, color: 'blue', desc: 'Không phải email của chính gia sư' },
    { id: 'self-students', label: 'Học sinh gia sư tự thêm', value: d.selfAddedStudents, icon: Repeat, color: 'orange', desc: 'Cùng email với gia sư (gia sư tự đặt thử)' },
    { id: 'lessons', label: 'Tổng số buổi học', value: d.totalLessons, icon: BookOpen, color: 'purple', desc: 'Đã đặt và đã hoàn thành' },
  ]

  const failedTables = [...new Set([...d.failedTables, ...(paying.failed ? ['tutors'] : [])])]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Khách hàng của tôi</h1>
        <p className="text-sm text-gray-500 mt-1">Ai đang trả phí, bao nhiêu người đã lên gói trả phí, và gia sư dùng Tutafy ra sao</p>
      </div>

      {failedTables.length > 0 && (
        <div data-testid="overview-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {readErrorMessage(failedTables)}
        </div>
      )}
      {d.truncated && (
        <div data-testid="overview-truncated" role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          Có quá nhiều dòng để đọc hết, nên vài con số bên dưới có thể chưa đủ.
        </div>
      )}

      {/* 1. who pays */}
      <section className="space-y-4" aria-labelledby="paying-title">
        <h2 id="paying-title" className="text-lg font-semibold text-gray-900">Người trả phí</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Card id="pro" label="Gói Pro" value={paying.failed ? '—' : show(paying.pro)} hint="Gia sư đang ở gói Pro" icon={ShoppingBag} />
          <Card id="academy" label="Gói Academy" value={paying.failed ? '—' : show(paying.academy)} hint="Gia sư đang ở gói Academy" icon={ShoppingBag} color="purple" />
          <Card id="free" label="Gói miễn phí" value={c ? show(c.free) : '—'} hint="Gia sư chưa trả phí" icon={Users} color="blue" />
          <Card id="moved-up" label="Tỉ lệ lên trả phí" value={c && c.movedUpPercent !== null ? `${c.movedUpPercent}%` : '—'}
            hint={c ? `${c.paying} trong ${c.tutors.toLocaleString('en-US')} gia sư đang trả phí` : 'Chưa đọc được'} icon={Percent} color="green" />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <Card id="new-paying-7" label="Mới nâng gói, 7 ngày" value={paying.failed ? '—' : show(paying.newPaying.d7)} hint="Ngày mua nằm trong 7 ngày qua" icon={Sparkles} color="orange" />
          <Card id="new-paying-30" label="Mới nâng gói, 30 ngày" value={paying.failed ? '—' : show(paying.newPaying.d30)} hint="Ngày mua nằm trong 30 ngày qua" icon={Sparkles} color="orange" />
        </div>
        {!paying.failed && (paying.newPaying.datedBySignup > 0 || paying.datesFailedTables.length > 0) && (
          <p data-testid="date-note" className="text-xs text-gray-500">
            {paying.datesFailedTables.length > 0
              ? 'Chưa đọc được ngày thanh toán (bảng theo dõi khách vào web chưa dùng được, tệp 015), nên ngày mua được tính bằng ngày đăng ký.'
              : `${paying.newPaying.datedBySignup} trong các người mới nâng gói chưa có ngày thanh toán được ghi, nên ngày mua của họ tính bằng ngày đăng ký.`}
          </p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Danh sách người trả phí</h3>
            <span className="text-xs text-gray-400">bấm tên để xem từng người</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="paying-list">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Gia sư</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">Gói</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Ngày mua</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">Học sinh</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-500">Buổi học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paying.customers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-6">{paying.failed ? 'Chưa đọc được danh sách' : 'Chưa có ai trả phí'}</td></tr>
                )}
                {paying.customers.map(p => (
                  <tr key={p.id} data-customer={p.id}>
                    <td className="px-5 py-3">
                      <Link href={`/super-admin/people/${p.id}`} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline">{p.name}</Link>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </td>
                    <td className="px-5 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(p.plan)}`}>{planLabel(p.plan)}</span></td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">{dayLabel(p.boughtOn)}{!p.boughtDateKnown && <span className="text-xs text-gray-400" title="Chưa có ngày thanh toán được ghi: đây là ngày đăng ký"> (đăng ký)</span>}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{p.students}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{p.lessons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paying.listCut && <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-50">Danh sách chỉ hiện những người mới nhất; các con số phía trên vẫn đếm đủ.</p>}
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-start gap-3 text-sm text-indigo-900">
          <Wallet className="h-4 w-4 mt-0.5 shrink-0 text-indigo-500" />
          <p>
            <strong>Tiền từ các gói của bạn</strong> nằm ở trang <Link href="/admin/revenue" className="underline font-medium">Tiền học sinh trả</Link>, cùng chỗ giải thích vì sao
            số ở đó không phải thu nhập của bạn.
          </p>
        </div>
      </section>

      {/* 2. how they use it */}
      <section className="space-y-4" aria-labelledby="activity-title">
        <h2 id="activity-title" className="text-lg font-semibold text-gray-900">Họ dùng ra sao</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Card id="used-7" label="Gia sư dùng, 7 ngày" value={a ? show(a.usedTutors7) : '—'} hint="Có buổi học mới đặt, hoặc một buổi đã dạy xong trong 7 ngày qua" icon={UserRoundCheck} color="green" />
          <Card id="booked-7" label="Buổi học được đặt, 7 ngày" value={a ? show(a.lessonsBooked7) : '—'} hint="Không tính buổi đã huỷ" icon={CalendarCheck} />
          <Card id="new-real-7" label="Gia sư mới có học sinh đầu tiên, 7 ngày" value={a ? show(a.newWithRealStudent7) : '—'} hint={a ? `trong ${a.newTutors7} gia sư đăng ký 7 ngày qua (học sinh thật, không phải học sinh tự thêm)` : 'Chưa đọc được'} icon={UserPlus} color="orange" />
          <Card id="new-real-30" label="Gia sư mới có học sinh đầu tiên, 30 ngày" value={a ? show(a.newWithRealStudent30) : '—'} hint={a ? `trong ${a.newTutors30} gia sư đăng ký 30 ngày qua` : 'Chưa đọc được'} icon={UserPlus} color="orange" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-x-2 gap-y-1 flex-wrap">
            <TrendingUp className="h-4 w-4 text-gray-400 shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm whitespace-nowrap">Đăng ký theo tuần</h3>
            <span className="text-xs text-gray-400">12 tuần gần nhất, tuần bắt đầu từ thứ Hai (giờ UTC)</span>
          </div>
          {d.weekly ? <WeeklyChart weeks={d.weekly} /> : <p className="text-sm text-gray-400 text-center py-6">Chưa đọc được bảng gia sư</p>}
        </div>
      </section>

      {/* 3. the whole platform (T-0680) */}
      <section className="space-y-4" aria-labelledby="platform-title">
        <h2 id="platform-title" className="text-lg font-semibold text-gray-900">Toàn nền tảng</h2>
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
              <h3 className="font-semibold text-gray-900 text-sm">Gia sư đăng ký gần đây</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {d.recentTutors.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Chưa có gia sư nào</p>
              )}
              {d.recentTutors.map(t => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    <p className="text-xs text-gray-400 truncate">{t.email}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{dayLabel(t.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900 text-sm">Buổi học gần đây</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {d.recentLessons.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Chưa có buổi học nào</p>
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
                  }`}>{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
