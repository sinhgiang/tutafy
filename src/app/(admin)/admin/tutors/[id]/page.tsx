import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminT } from '@/lib/admin-lang'
import { readErrorText, sourceText, pageLabelText } from '@/lib/admin-i18n'
import { isTutorId, loadJourney } from '@/lib/people-data'
import { buildJourneyView } from '@/lib/journey-view'
import { loadTutorDetail } from '@/lib/tutor-detail-data'
import { readPolarBilling, buildBuyerBilling } from '@/lib/buyer-billing'
import { isBuyerPlan, planBadgeClass, planLabel, POLAR_DASHBOARD_URL } from '@/lib/buyers'
import { formatMoney } from '@/lib/currency'
import { countryName, formatDayLabel } from '@/lib/format'
import { JourneyStep } from '@/components/admin/JourneyStep'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

/** Lines of the journey shown here; the rest is one click away on the full journey page. */
const STEPS_SHOWN = 12
const STATUS_STYLE = { active: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600', past_due: 'bg-red-100 text-red-700', other: 'bg-gray-100 text-gray-500' } as const

function Fact({ label, value, hint, testid }: { label: string; value: React.ReactNode; hint?: string; testid: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-900" data-testid={testid}>{value}</dd>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

export default async function AdminTutorPage({ params }: { params: Promise<{ id: string }> }) {
  // Own check, before any query: this page reads one tutor's account, payments and visits with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

  const { id } = await params
  if (!isTutorId(id)) notFound()

  const admin = createAdminClient()
  const [detail, journey] = await Promise.all([loadTutorDetail(admin, id), loadJourney(admin, id, false)])
  if (!detail || !journey) notFound()
  const { tutor, students, lessons } = detail
  const p = journey.person

  // Payment: the same Polar reads and the same matching as the Buyers page (read-only). Asked only for a tutor on a paid plan or with a
  // subscription on record, so a Free tutor costs no request.
  const paid = isBuyerPlan(tutor.subscription_status) || Boolean(tutor.polar_subscription_id)
  const polar = await readPolarBilling(paid)
  const bill = buildBuyerBilling([tutor], polar).get(tutor.id)
  const sub = bill?.sub ?? null
  const unreadable = polar
    ? [
        ...(!polar.subscriptions.ok ? [{ what: t('buyers.polarPlans'), reason: polar.subscriptions.reason }] : []),
        ...(!polar.orders.ok ? [{ what: t('buyers.polarOrders'), reason: polar.orders.reason }] : []),
      ]
    : []
  const whySub = bill?.subWhy ? t(`buyers.why.${bill.subWhy}`) : null
  const failedTables = [...new Set([...detail.failedTables, ...journey.failedTables])]

  const view = buildJourneyView(journey.timeline, 1)
  const shownRows = view.rows.slice(0, STEPS_SHOWN)
  const moreSteps = Math.max(0, view.lines - shownRows.length)
  const dash = <span className="text-gray-400">—</span>

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/tutors" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> {t('tutor.back')}
      </Link>

      {failedTables.length > 0 && (
        <div data-testid="tutor-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {readErrorText(t, failedTables)}
        </div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="tutor-name">{tutor.name || tutor.email}</h1>
            <p className="text-sm text-gray-400">{tutor.email}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeClass(tutor.subscription_status)}`}>{planLabel(tutor.subscription_status)}</span>
        </div>
      </div>

      <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100" aria-labelledby="tutor-account">
        <h2 id="tutor-account" className="text-sm font-semibold text-gray-900 mb-4">{t('tutor.secAccount')}</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Fact testid="tutor-signed-up" label={t('common.signedUp')} value={formatDayLabel(tutor.created_at)} />
          <Fact testid="tutor-plan" label={t('common.plan')} value={planLabel(tutor.subscription_status)} />
          <Fact testid="tutor-lessons" label={t('common.lessons')} value={lessons ? lessons.total : dash}
            hint={lessons ? t('tutor.lessonsBreakdown', { completed: lessons.completed, scheduled: lessons.scheduled, cancelled: lessons.cancelled }) : undefined} />
          <Fact testid="tutor-real-students" label={t('tutor.realStudents')} value={students ? students.real : dash} />
          <Fact testid="tutor-self-students" label={t('tutor.selfStudents')} value={students ? students.selfAdded : dash} hint={t('tutor.selfHint')} />
        </dl>
      </section>

      <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100" aria-labelledby="tutor-payment">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="tutor-payment" className="text-sm font-semibold text-gray-900">{t('tutor.secPayment')}</h2>
          {paid && (
            <a href={POLAR_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              {t('buyers.openPolar')} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {!paid ? (
          <p data-testid="tutor-free" className="text-sm text-gray-500">{t('tutor.freePlan')}</p>
        ) : (
          <>
            {unreadable.length > 0 && (
              <div data-testid="tutor-polar-unreadable" role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 space-y-1 mb-4">
                {unreadable.map(u => <p key={u.what}><span className="font-semibold">Polar · {u.what}:</span> {t(`revenue.polar.${u.reason}`)}</p>)}
              </div>
            )}
            {whySub && <p data-testid="tutor-why" className="text-xs text-gray-500 mb-4">{whySub}</p>}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Fact testid="tutor-paid" label={t('buyers.colPaid')} value={bill?.paid
                ? (bill.paid.length > 0 ? bill.paid.map(m => <span key={m.currency} className="block">{formatMoney(m.amount, m.currency)} <span className="text-xs text-gray-400">{m.currency}</span></span>)
                  : <>{formatMoney(0, sub?.price.currency ?? 'USD')} <span className="text-xs text-gray-400">{sub?.price.currency ?? 'USD'}</span></>)
                : dash} />
              <Fact testid="tutor-price" label={t('buyers.colPrice')} value={sub
                ? <>{formatMoney(sub.price.amount, sub.price.currency)} <span className="text-xs text-gray-400">{t(sub.price.interval === 'year' ? 'buyers.perYear' : 'buyers.perMonth')} · {sub.price.currency}</span></>
                : dash} />
              <Fact testid="tutor-started" label={t('buyers.colStarted')} value={sub ? formatDayLabel(sub.started) : dash} />
              <Fact testid="tutor-date" label={sub?.dateKind === 'ends' ? t('buyers.ends') : t('buyers.nextCharge')} value={sub && sub.dateKind ? formatDayLabel(sub.date) : dash} />
              <Fact testid="tutor-status" label={t('common.status')} value={sub
                ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[sub.status]}`}>{t(`buyers.status.${sub.status}`)}</span>
                : dash} />
            </dl>
          </>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" aria-labelledby="tutor-journey">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 id="tutor-journey" className="text-sm font-semibold text-gray-900">{t('tutor.secJourney')}</h2>
          <Link href={`/super-admin/people/${id}`} className="text-xs text-indigo-600 hover:underline">{t('tutor.fullJourney')}</Link>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-5 py-4 text-sm">
          <Fact testid="journey-source" label={t('journey.firstSource')} value={p.tracked && p.firstSource ? sourceText(t, p.firstSource) : dash} />
          <Fact testid="journey-country" label={t('common.country')} value={p.tracked ? countryName(p.country) : dash} />
          <Fact testid="journey-landing" label={t('tutor.landing')} value={p.tracked && p.firstPath ? pageLabelText(t, p.firstPath) : dash} />
          <Fact testid="journey-signup" label={t('tutor.signedUpFree')} value={formatDayLabel(p.signedUp)} />
          <Fact testid="journey-upgrade" label={t('tutor.upgradedPaid')} value={p.upgradedAt ? `${formatDayLabel(p.upgradedAt)}${p.upgradedPlan ? ` (${planLabel(p.upgradedPlan)})` : ''}` : dash} />
        </dl>
        {!p.tracked ? (
          <p data-testid="tutor-no-journey" className="px-5 pb-4 text-xs text-gray-500">{t('tutor.noJourney')}</p>
        ) : (
          <>
            <div className="border-t border-gray-100 px-5 py-2 text-xs font-medium text-gray-500">{t('tutor.pagesVisited')}</div>
            <ol className="divide-y divide-gray-50" data-testid="tutor-timeline">
              {shownRows.map(({ row, index }) => <JourneyStep key={index} e={row} t={t} />)}
            </ol>
            {moreSteps > 0 && (
              <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-50">
                <Link href={`/super-admin/people/${id}`} className="text-indigo-600 hover:underline">{t('tutor.moreSteps', { n: moreSteps })}</Link>
              </p>
            )}
          </>
        )}
        <p className="px-5 pb-4 text-[11px] text-gray-400" data-testid="tutor-ai-note">{t('tutor.aiNote')}</p>
      </section>
    </div>
  )
}
