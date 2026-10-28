'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminT } from '@/components/admin/AdminLang'
import type { AdminKey } from '@/lib/admin-i18n'
import { formatWhen } from '@/lib/format'
import { SPACING_MS } from '@/lib/tutor-announcement'

// The three buttons of the tutor email page (T-1064). Each one is a POST to an admin API that checks, on the server, that the caller is the platform
// admin; nothing in this file decides who may send. No address or name is ever in the page: the routes answer with numbers, times and a reason.
type Props = { toQueue: number | null; ready: boolean; testSentAt: string | null; inFlight: number }
type Busy = 'test' | 'start' | 'stop' | null
type Note = { kind: 'ok' | 'error'; text: string } | null

const REASONS: Record<string, AdminKey> = {
  'no-mail-key': 'ann.errNoMailKey',
  'no-unsubscribe-secret': 'ann.errNoSecret',
  'tables-missing': 'ann.errTables',
  'read-failed': 'ann.errRead',
  'test-first': 'ann.errTestFirst',
  'too-many': 'ann.errTooMany',
  nothing: 'ann.errNothing',
  'already-started': 'ann.errAlready',
  refused: 'ann.errRefused',
}

const btn = 'px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed'
const stamp = (iso: string) => `${formatWhen(iso)} UTC`

export function AnnouncementControls({ toQueue, ready, testSentAt, inFlight }: Props) {
  const t = useAdminT()
  const router = useRouter()
  const [busy, setBusy] = useState<Busy>(null)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState<Note>(null)

  async function post(path: string, body?: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
    const res = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return { status: res.status, data }
  }
  const failure = (status: number, data: Record<string, unknown>): string => {
    if (status === 429) return t('ann.errTooFast')
    const reason = String(data.reason ?? '')
    if (reason === 'count-changed') return t('ann.errCount', { n: Number(data.actual ?? 0) })
    const key = REASONS[reason]
    return key ? t(key) : t('ann.errGeneric')
  }

  async function sendTest() {
    setBusy('test'); setNote(null)
    try {
      const { status, data } = await post('/api/admin/announcement/test')
      setNote(status === 200 ? { kind: 'ok', text: t('ann.testDone') } : { kind: 'error', text: failure(status, data) })
    } catch { setNote({ kind: 'error', text: t('ann.errGeneric') }) }
    setBusy(null); router.refresh()
  }

  async function start() {
    if (toQueue === null) return
    setConfirming(false); setBusy('start'); setNote({ kind: 'ok', text: t('ann.starting') })
    try {
      const { status, data } = await post('/api/admin/announcement/start', { expected: toQueue })
      if (status === 200) {
        const failed = Number(data.failed ?? 0)
        const text = t('ann.started', { n: Number(data.queued ?? 0), when: stamp(String(data.firstAt)), last: stamp(String(data.lastAt)) })
        setNote({ kind: failed > 0 ? 'error' : 'ok', text: failed > 0 ? `${text} ${t('ann.startedFailed', { n: failed })}` : text })
      } else setNote({ kind: 'error', text: failure(status, data) })
    } catch { setNote({ kind: 'error', text: t('ann.errGeneric') }) }
    setBusy(null); router.refresh()
  }

  async function stop() {
    setBusy('stop'); setNote({ kind: 'ok', text: t('ann.stopping') })
    try {
      const { status, data } = await post('/api/admin/announcement/stop')
      if (status === 200) {
        const left = Number(data.notCancelled ?? 0)
        const text = t('ann.stopped', { cancelled: Number(data.cancelled ?? 0), gone: Number(data.alreadyGone ?? 0), failed: left })
        setNote({ kind: left > 0 ? 'error' : 'ok', text: left > 0 ? `${text} ${t('ann.stopAgain')}` : text })
      } else setNote({ kind: 'error', text: failure(status, data) })
    } catch { setNote({ kind: 'error', text: t('ann.errGeneric') }) }
    setBusy(null); router.refresh()
  }

  const minutes = toQueue ? Math.ceil((toQueue * SPACING_MS) / 60_000) : 0
  const card = 'bg-white rounded-xl p-5 shadow-sm border border-gray-100'

  return (
    <div className="space-y-5" data-testid="announcement-controls">
      <section className={card} aria-labelledby="ann-step1">
        <h2 id="ann-step1" className="text-sm font-semibold text-gray-900">{t('ann.step1')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('ann.step1Hint')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" data-testid="send-test" onClick={sendTest} disabled={busy !== null || !ready} className={`${btn} bg-gray-900 text-white`}>
            {busy === 'test' ? t('ann.testing') : t('ann.testButton')}
          </button>
          <span className="text-xs text-gray-500" data-testid="test-last">{testSentAt ? t('ann.testLast', { when: stamp(testSentAt) }) : t('ann.testNone')}</span>
        </div>
      </section>

      <section className={card} aria-labelledby="ann-step2">
        <h2 id="ann-step2" className="text-sm font-semibold text-gray-900">{t('ann.step2')}</h2>
        <p className="text-sm text-gray-500 mt-1" data-testid="start-hint">{toQueue ? t('ann.step2Hint', { n: toQueue, minutes }) : t('ann.step2None')}</p>
        {!confirming && (
          <button type="button" data-testid="start" onClick={() => setConfirming(true)} disabled={busy !== null || !ready || !toQueue || !testSentAt} className={`${btn} mt-3 bg-indigo-600 text-white`}>
            {t('ann.startButton')}
          </button>
        )}
        {confirming && toQueue ? (
          <div role="alertdialog" aria-labelledby="ann-confirm-title" aria-describedby="ann-confirm-body" data-testid="confirm" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p id="ann-confirm-title" className="text-sm font-semibold text-amber-900">{t('ann.confirmTitle', { n: toQueue })}</p>
            <p id="ann-confirm-body" className="text-sm text-amber-900 mt-1">{t('ann.confirmBody', { n: toQueue, minutes })}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" data-testid="confirm-yes" onClick={start} className={`${btn} bg-indigo-600 text-white`}>{t('ann.confirmYes')}</button>
              <button type="button" data-testid="confirm-cancel" onClick={() => setConfirming(false)} className={`${btn} bg-white border border-gray-300 text-gray-700`}>{t('ann.confirmCancel')}</button>
            </div>
          </div>
        ) : null}
      </section>

      <section className={card} aria-labelledby="ann-step3">
        <h2 id="ann-step3" className="text-sm font-semibold text-gray-900">{t('ann.step3')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('ann.step3Hint')}</p>
        <button type="button" data-testid="stop" onClick={stop} disabled={busy !== null || !ready || inFlight === 0} className={`${btn} mt-3 bg-red-600 text-white`}>
          {busy === 'stop' ? t('ann.stopping') : t('ann.stopButton')}
        </button>
      </section>

      <div role="status" aria-live="polite" data-testid="note" className={note ? `rounded-lg px-4 py-3 text-sm ${note.kind === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}` : 'hidden'}>
        {note?.text}
      </div>
    </div>
  )
}
