'use client'

// The rows of the Lessons list with a checkbox on each (T-0822): a row opens the lesson with Enter or a click, the date is
// also a real link (Tab reaches it), and selected lessons can be marked paid or completed from a bar above the table.
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/currency'
import { studentOf, type LessonRow } from '@/lib/lesson-list'

const STATUS_CHIP: Record<string, string> = { scheduled: 'is-brand-chip', completed: 'is-ok', cancelled: 'is-err', no_show: '' }
const PAY_CHIP: Record<string, string> = { pending: 'is-warn', paid: 'is-ok', refunded: 'is-err', free: '' }

export function LessonsClient({ rows, currency }: { rows: LessonRow[]; currency: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const allOnPage = rows.length > 0 && rows.every(r => selected.has(r.id))

  function toggle(id: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  async function bulk(action: 'mark_paid' | 'mark_completed') {
    setBusy(true)
    try {
      const res = await fetch('/api/lessons/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lesson_ids: [...selected], action }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Updated ${data.updated} lesson${data.updated === 1 ? '' : 's'}`)
        setSelected(new Set())
        router.refresh()
      } else toast.error(data.error ?? 'Could not update the lessons')
    } finally { setBusy(false) }
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="dash-bulk" role="region" aria-label="Bulk actions" data-testid="bulk-bar">
          <span>{selected.size} selected</span>
          <button type="button" className="dash-btn" disabled={busy} onClick={() => bulk('mark_paid')}>Mark paid</button>
          <button type="button" className="dash-btn" disabled={busy} onClick={() => bulk('mark_completed')}>Mark completed</button>
          <button type="button" className="dash-btn is-ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <div className="dash-table-wrap overflow-x-auto">
        <table className="dash-table is-cards">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input type="checkbox" className="dash-check" aria-label="Select all lessons on this page" checked={allOnPage}
                  onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map(r => r.id)))} />
              </th>
              <th>Student</th><th>Date</th><th>Duration</th><th className="is-num">Price</th><th>Status</th><th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => {
              const s = studentOf(l)
              const start = new Date(l.starts_at)
              const when = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
              const pay = l.payment_status ?? 'pending'
              return (
                <tr key={l.id} tabIndex={0} data-selected={selected.has(l.id)} aria-label={`Open the lesson with ${s?.name ?? 'a student'}`}
                  onClick={e => { if (!(e.target as HTMLElement).closest('a, input, button')) router.push(`/lessons/${l.id}`) }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) router.push(`/lessons/${l.id}`) }}>
                  <td className="c-sel"><input type="checkbox" className="dash-check" aria-label={`Select the lesson with ${s?.name ?? 'a student'}`} checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                  <td className="c-main"><div className="dash-who"><div style={{ minWidth: 0 }}><b><Link href={`/lessons/${l.id}`}>{s?.name ?? 'Unknown student'}</Link></b><span className="dash-m-only">{when}, {l.duration_minutes} min</span></div></div></td>
                  <td className="c-hide">{when}</td>
                  <td className="c-hide">{l.duration_minutes} min</td>
                  <td className="c-end is-num">{l.price != null ? formatMoney(Number(l.price), currency) : '-'}</td>
                  <td className="c-sub"><span className={`dash-chip ${STATUS_CHIP[l.status] ?? ''}`}>{l.status.replace('_', ' ')}</span> <span className={`dash-chip dash-m-only ${PAY_CHIP[pay] ?? ""}`} style={{ marginLeft: 6 }}>{pay}</span></td>
                  <td className="c-hide"><span className={`dash-chip ${PAY_CHIP[pay] ?? ''}`}>{pay}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
