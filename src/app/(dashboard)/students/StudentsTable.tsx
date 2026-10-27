'use client'

// The rows of the Students list with a checkbox on each (T-0822). A row opens the student with Enter or a click; the name
// is also a real link, so Tab reaches it. Selecting rows shows a bulk bar above the table (in the page flow, never over it).
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { StudentRow } from '@/lib/student-list'

const STATUS_CHIP: Record<string, string> = { active: 'is-ok', paused: 'is-warn', inactive: '' }

export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const allOnPage = rows.length > 0 && rows.every(r => selected.has(r.id))

  function toggle(id: string) {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  async function setStatus(status: 'active' | 'paused' | 'inactive') {
    setBusy(true)
    try {
      const res = await fetch('/api/students/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected], status }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`Updated ${data.updated} student${data.updated === 1 ? '' : 's'}`)
        setSelected(new Set())
        router.refresh()
      } else toast.error(data.error ?? 'Could not update the students')
    } finally { setBusy(false) }
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="dash-bulk" role="region" aria-label="Bulk actions" data-testid="bulk-bar">
          <span>{selected.size} selected</span>
          <button type="button" className="dash-btn" disabled={busy} onClick={() => setStatus('active')}>Set active</button>
          <button type="button" className="dash-btn" disabled={busy} onClick={() => setStatus('paused')}>Pause</button>
          <button type="button" className="dash-btn" disabled={busy} onClick={() => setStatus('inactive')}>Set inactive</button>
          <button type="button" className="dash-btn is-ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <div className="dash-table-wrap overflow-x-auto">
        <table className="dash-table is-cards">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input type="checkbox" className="dash-check" aria-label="Select all students on this page" checked={allOnPage}
                  onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map(r => r.id)))} />
              </th>
              <th>Student</th><th>Level</th><th>Country</th><th>Goals</th><th>Status</th><th>Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => {
              const initials = s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <tr key={s.id} tabIndex={0} data-selected={selected.has(s.id)} aria-label={`Open ${s.name}`}
                  onClick={e => { if (!(e.target as HTMLElement).closest('a, input, button')) router.push(`/students/${s.id}`) }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) router.push(`/students/${s.id}`) }}>
                  <td className="c-sel">
                    <input type="checkbox" className="dash-check" aria-label={`Select ${s.name}`} checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  </td>
                  <td className="c-main">
                    <div className="dash-who">
                      <span className="dash-avatar" aria-hidden="true">{initials}</span>
                      <div style={{ minWidth: 0 }}>
                        <b><Link href={`/students/${s.id}`}>{s.name}</Link></b>
                        {s.email && <span>{s.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="c-end">{s.level ? <span className="dash-chip is-brand-chip">{s.level}</span> : '-'}</td>
                  <td className="c-hide">{s.country ?? '-'}</td>
                  <td className="c-hide"><div className="dash-goal">{s.goals ?? '-'}</div></td>
                  <td className="c-sub"><span className={`dash-chip ${STATUS_CHIP[s.status] ?? ''}`}>{s.status}</span> <span className="dash-m-only"> Added {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></td>
                  <td className="c-hide">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
