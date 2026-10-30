import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminT } from '@/lib/admin-lang'
import { loadAnnouncementStatus, type StatusRow } from '@/lib/tutor-announcement-run'
import { AVAILABILITY_CAMPAIGN, AVAILABILITY_SUBJECT, CAMPAIGN, SUBJECT, parseCampaign, DEFAULT_CAMPAIGN, type CampaignId } from '@/lib/tutor-announcement'
import { formatWhen } from '@/lib/format'
import type { AdminKey } from '@/lib/admin-i18n'
import { AnnouncementControls } from './AnnouncementControls'

export const dynamic = 'force-dynamic'

const STATE_KEY: Record<StatusRow['state'], AdminKey> = {
  queued: 'ann.stateQueued',
  scheduled: 'ann.stateScheduled',
  sent: 'ann.stateSent',
  cancelled: 'ann.stateCancelled',
  failed: 'ann.stateFailed',
}
const STATE_STYLE: Record<StatusRow['state'], string> = {
  queued: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-700',
}
const stamp = (iso: string) => `${formatWhen(iso)} UTC`

// The letters this page can send (T-1115): the id, the name on its tab, and who it goes to. The subject line is shown as the letter's own name.
const LETTERS: { id: CampaignId; tab: AdminKey; who: AdminKey; subject: string }[] = [
  { id: CAMPAIGN, tab: 'ann.letterProfile', who: 'ann.whoProfile', subject: SUBJECT },
  { id: AVAILABILITY_CAMPAIGN, tab: 'ann.letterHours', who: 'ann.whoHours', subject: AVAILABILITY_SUBJECT },
]

/**
 * The page of the one-off tutor email (T-1064): setup checks, the test and start and stop buttons, and the numbers. Tutors appear only as
 * numbers: this page reads no name and no address for display. The buttons call admin APIs that check the admin again on the server.
 */
export default async function AnnouncementPage({ searchParams }: { searchParams?: Promise<{ campaign?: string | string[] }> } = {}) {
  // Own check, before any query: this page reads the tutor list with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()
  // Which letter is on screen: ?campaign=<id>, from the fixed list only; anything else (or nothing) is the first letter.
  const asked = (await searchParams)?.campaign
  const campaign = parseCampaign(Array.isArray(asked) ? asked[0] : asked) ?? DEFAULT_CAMPAIGN
  const letter = LETTERS.find(l => l.id === campaign) ?? LETTERS[0]
  const status = await loadAnnouncementStatus(createAdminClient(), process.env, new Date(), campaign)

  const setup: [AdminKey, boolean][] = [
    ['ann.setupAdmin', status.setup.adminEmail],
    ['ann.setupMail', status.setup.mailKey],
    ['ann.setupSecret', status.setup.unsubscribeSecret],
    ['ann.setupTables', status.setup.tables],
  ]
  const ready = setup.every(([, ok]) => ok) && !status.readFailed
  const counts: [AdminKey, number, string][] = [
    ['ann.cWaiting', status.counts.waiting, 'waiting'],
    ['ann.cSent', status.counts.gone, 'sent'],
    ['ann.cQueued', status.counts.queued, 'queued'],
    ['ann.cCancelled', status.counts.cancelled, 'cancelled'],
    ['ann.cFailed', status.counts.failed, 'failed'],
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/super-admin" className="text-xs text-gray-500 hover:text-gray-800">← {t('sa.title')}</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{t('ann.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('ann.subtitle')}</p>
      </div>

      <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100" aria-labelledby="ann-letter">
        <h2 id="ann-letter" className="text-sm font-semibold text-gray-900">{t('ann.letterTitle')}</h2>
        <nav className="mt-2 flex flex-wrap gap-2" aria-label={t('ann.letterTitle')} data-testid="letters">
          {LETTERS.map(l => (
            <Link
              key={l.id}
              href={l.id === DEFAULT_CAMPAIGN ? '/super-admin/announcement' : `/super-admin/announcement?campaign=${l.id}`}
              aria-current={l.id === campaign ? 'page' : undefined}
              data-letter={l.id}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${l.id === campaign ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >{t(l.tab)}</Link>
          ))}
        </nav>
        <p className="text-sm text-gray-700 mt-3" data-testid="letter-subject">{t('ann.subjectLabel')}: <span className="font-medium">{letter.subject}</span></p>
        <p className="text-sm text-gray-500 mt-1" data-testid="letter-who">{t(letter.who)}</p>
      </section>

      <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100" aria-labelledby="ann-setup">
        <h2 id="ann-setup" className="text-sm font-semibold text-gray-900">{t('ann.setupTitle')}</h2>
        <ul className="mt-2 space-y-1.5 text-sm" data-testid="setup">
          {setup.map(([key, ok]) => (
            <li key={key} className="flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ok ? t('ann.ready') : t('ann.missing')}</span>
              <span className="text-gray-700">{t(key)}</span>
            </li>
          ))}
        </ul>
        {status.readFailed && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{t('ann.readFailed')}</p>}
      </section>

      <AnnouncementControls key={campaign} campaign={campaign} toQueue={status.toQueue} ready={ready} testSentAt={status.testSentAt} inFlight={status.counts.waiting + status.counts.queued} />

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" aria-labelledby="ann-status">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 id="ann-status" className="text-sm font-semibold text-gray-900">{t('ann.statusTitle')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {status.nextAt ? t('ann.nextAt', { when: stamp(status.nextAt) }) : null}
            {status.nextAt && status.lastAt ? ' · ' : null}
            {status.lastAt ? t('ann.lastAt', { when: stamp(status.lastAt) }) : null}
            {status.stoppedAt ? ` · ${t('ann.stoppedAt', { when: stamp(status.stoppedAt) })}` : null}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5" data-testid="counts">
          {counts.map(([key, n, id]) => (
            <div key={id} className="rounded-lg border border-gray-100 p-3">
              <p className="text-xs text-gray-500">{t(key)}</p>
              <p data-testid={`count-${id}`} className="text-2xl font-bold text-gray-900">{n}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="queue-table">
            <thead className="bg-gray-50 border-y border-gray-100">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500">{t('ann.colNumber')}</th>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500">{t('ann.colTime')}</th>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500">{t('ann.colState')}</th>
                <th className="text-left px-5 py-2.5 font-medium text-gray-500">{t('ann.colError')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {status.rows.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">{t('ann.noRows')}</td></tr>}
              {status.rows.map(r => (
                <tr key={r.n} data-row={r.n}>
                  <td className="px-5 py-2.5 text-gray-700">{r.n}</td>
                  <td className="px-5 py-2.5 text-gray-700 whitespace-nowrap">{stamp(r.at)}</td>
                  <td className="px-5 py-2.5"><span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${STATE_STYLE[r.state]}`}>{t(STATE_KEY[r.state])}</span></td>
                  <td className="px-5 py-2.5 text-xs text-gray-500">{r.error ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">{t('ann.privacy')}</p>
      </section>
    </div>
  )
}
