import type { ReactNode } from 'react'
import type { TimelineEntry } from '@/lib/timeline'
import type { ViewRow } from '@/lib/journey-view'
import { countryName, formatWhen } from '@/lib/format'
import { pageLabelText, sourceText, type AdminT } from '@/lib/admin-i18n'
import { planLabel } from '@/lib/buyers'
import { Eye, Flag, UserPlus, MousePointerClick, BadgeCheck } from 'lucide-react'

// One line of a tutor's journey, drawn the same way on the journey page (/super-admin/people/[id]) and on the tutor's own page (/admin/tutors/[id]).
const ICON = { first_visit: Flag, page_view: Eye, signup: UserPlus, checkout_click: MousePointerClick, order_paid: BadgeCheck } as const
const DOT: Record<TimelineEntry['kind'], string> = {
  first_visit: 'bg-indigo-100 text-indigo-600',
  page_view: 'bg-gray-100 text-gray-500',
  signup: 'bg-blue-100 text-blue-600',
  checkout_click: 'bg-amber-100 text-amber-700',
  order_paid: 'bg-green-100 text-green-700',
}

// The words of one line of the journey, in the owner's language (the timeline itself only carries the facts).
export function stepTitle(t: AdminT, e: ViewRow): string {
  if (e.count) return t('journey.appRun', { n: e.count })
  switch (e.kind) {
    case 'first_visit': return t(e.another ? 'journey.anotherBrowser' : 'journey.firstVisit', { source: e.source ? sourceText(t, e.source) : '' })
    case 'page_view': return pageLabelText(t, e.path)
    case 'signup': return t('journey.signedUp')
    case 'checkout_click': return e.plan ? t('journey.clickedCheckoutPlan', { plan: planLabel(e.plan) }) : t('journey.clickedCheckout')
    case 'order_paid': return e.plan ? t('journey.upgradedTo', { plan: planLabel(e.plan) }) : t('journey.upgradedToPaid')
  }
}

export function JourneyStep({ e, id, extra, t }: { e: ViewRow; id?: string; extra?: ReactNode; t: AdminT }) {
  const Icon = ICON[e.kind]
  return (
    <li id={id} className="flex items-start gap-3 px-5 py-2.5 scroll-mt-4" data-kind={e.kind}>
      <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${DOT[e.kind]}`}><Icon className="h-3.5 w-3.5" /></span>
      <time className="w-36 flex-shrink-0 text-xs text-gray-400 pt-1 font-mono">{formatWhen(e.at)}</time>
      <div className="min-w-0">
        <p className={`text-sm ${e.kind === 'page_view' ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{stepTitle(t, e)}</p>
        {e.count && (
          <p className="text-xs text-gray-500" data-testid="app-run">
            {e.shownParts}{e.moreCount ? `, ${t('journey.more', { n: e.moreCount })}` : ''}{e.until && e.until !== e.at && t('journey.until', { when: formatWhen(e.until) })}
          </p>
        )}
        {e.kind === 'first_visit' && (
          <p className="text-xs text-gray-500">
            {countryName(e.country)}
            {e.referrerHost && t('journey.from', { host: e.referrerHost })}
            {e.campaign && t('journey.campaign', { name: e.campaign })}
            {e.path && <>{t('journey.landed', { page: pageLabelText(t, e.path) })} <span className="font-mono text-gray-400">({e.path})</span></>}
          </p>
        )}
        {e.kind !== 'first_visit' && !e.count && e.path && <p className="text-xs font-mono text-gray-400">{e.path}</p>}
        {extra}
      </div>
    </li>
  )
}

