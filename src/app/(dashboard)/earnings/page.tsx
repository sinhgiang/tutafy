// Earnings (T-0821): Payments and Reports in one page, in the 12-column grid of the shell.
// Tabs: Overview, Payments, Reports (Pro). A period switch (30 days, 90 days, 12 months, all time) drives the numbers
// and their trend against the period before. Every read is the signed-in tutor's own lessons (tutor_id from the session).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CircleAlert, Download, DollarSign, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/guard'
import { formatMoney } from '@/lib/currency'
import { loadTutorCurrency } from '@/lib/tutor-currency'
import {
  PERIODS, STATUS_FILTERS, attendanceOf, computeEarnings, filterHistory, parsePeriod, parseStatus,
  type Kpi, type LessonRow, type Period, type StatusFilter,
} from '@/lib/earnings'

const TABS = [{ value: 'overview', label: 'Overview' }, { value: 'payments', label: 'Payments' }, { value: 'reports', label: 'Reports' }] as const
type Tab = (typeof TABS)[number]['value']
const parseTab = (raw: string | undefined): Tab => TABS.some(t => t.value === raw) ? (raw as Tab) : 'overview'
const HISTORY_SHOWN = 100

const href = (tab: Tab, period: Period, status: StatusFilter) => {
  const q = new URLSearchParams()
  if (tab !== 'overview') q.set('tab', tab)
  q.set('period', period)
  if (tab === 'payments' && status !== 'all') q.set('status', status)
  return `/earnings?${q.toString()}`
}

function Delta({ kpi, goodWhenDown = false }: { kpi: Kpi; goodWhenDown?: boolean }) {
  const { pct, dir } = kpi.trend
  if (dir === 'none' || pct === null) return <span className="dash-delta">{kpi.previous === null ? 'No comparison' : 'New'}</span>
  const good = goodWhenDown ? dir === 'down' : dir === 'up'
  const bad = goodWhenDown ? dir === 'up' : dir === 'down'
  return <span className={`dash-delta ${good ? 'is-up' : bad ? 'is-down' : ''}`}>{pct > 0 ? '+' : ''}{pct}%</span>
}

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ tab?: string; period?: string; status?: string }> }) {
  const sp = await searchParams
  const tab = parseTab(sp.tab)
  const period = parsePeriod(sp.period)
  const status = parseStatus(sp.status)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Reports is a Pro feature: the gate runs on the server, before any report is read.
  if (tab === 'reports') {
    const locked = await requireFeature('pro', 'Reports')
    if (locked) return locked
  }

  const { data, error } = await supabase
    .from('lessons')
    .select('id, starts_at, price, payment_status, status, duration_minutes, students(id, name)')
    .eq('tutor_id', user.id)
    .order('starts_at', { ascending: false })

  const head = (
    <div className="dash-head">
      <div>
        <h1>Earnings</h1>
        <p>Money in, lessons taught and who pays you.</p>
      </div>
      <div className="dash-head-actions">
        <nav className="dash-seg" aria-label="Period">
          {PERIODS.map(p => <Link key={p.value} href={href(tab, p.value, status)} aria-current={p.value === period ? 'true' : undefined}>{p.label}</Link>)}
        </nav>
        {tab !== 'reports' && (
          <a className="dash-btn" data-testid="export-csv" href={`/api/earnings/export?period=${period}&status=${tab === 'payments' ? status : 'all'}`}>
            <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
          </a>
        )}
      </div>
    </div>
  )
  const tabs = (
    <nav className="dash-tabs" aria-label="Earnings sections">
      {TABS.map(t => <Link key={t.value} href={href(t.value, period, status)} aria-current={t.value === tab ? 'page' : undefined}>{t.label}</Link>)}
    </nav>
  )

  if (error) {
    return (
      <div>
        {head}{tabs}
        <div className="dash-card dash-state" role="alert" data-testid="earnings-error">
          <div className="dash-state-ico"><CircleAlert className="h-6 w-6" aria-hidden="true" /></div>
          <h2>We could not load your earnings</h2>
          <p>Nothing was changed. Check your connection and try again. If it keeps failing, tell us and we will look.</p>
          <div className="dash-state-actions">
            <Link href={href(tab, period, status)} className="dash-btn is-primary"><RotateCw className="h-4 w-4" aria-hidden="true" /> Try again</Link>
            <Link href="/contact" className="dash-btn">Contact support</Link>
          </div>
        </div>
      </div>
    )
  }

  const currency = await loadTutorCurrency(supabase, user.id)
  const all = (data ?? []) as unknown as LessonRow[]
  const now = new Date()
  const e = computeEarnings(all, now, period)
  const money = (n: number, whole = false) => formatMoney(n, currency, whole)

  if (e.empty) {
    return (
      <div>
        {head}{tabs}
        <div className="dash-card dash-state" data-testid="earnings-empty">
          <div className="dash-state-ico is-brand"><DollarSign className="h-6 w-6" aria-hidden="true" /></div>
          <h2>No earnings yet</h2>
          <p>When you schedule a lesson with a price, it shows up here with what is paid and what is still owed.</p>
          <div className="dash-state-actions"><Link href="/lessons/new" className="dash-btn is-primary">Schedule a lesson</Link></div>
        </div>
      </div>
    )
  }

  const periodLabel = PERIODS.find(p => p.value === period)!.label.toLowerCase()
  const kpis = (
    <div className="dash-grid" style={{ marginBottom: 16 }}>
      <div className="dash-card dash-kpi dash-c3" data-testid="kpi-earned">
        <span className="dash-kpi-label">Earned</span>
        <span className="dash-kpi-value">{money(e.earned.value)}</span>
        <span className="dash-kpi-foot"><Delta kpi={e.earned} /> {e.earned.previous ? <>was {money(e.earned.previous, true)}</> : null}</span>
      </div>
      <div className="dash-card dash-kpi dash-c3" data-testid="kpi-pending">
        <span className="dash-kpi-label">Still owed</span>
        <span className="dash-kpi-value">{money(e.pending.value)}</span>
        <span className="dash-kpi-foot"><Delta kpi={e.pending} goodWhenDown /> {e.pending.previous ? <>was {money(e.pending.previous, true)}</> : null}</span>
      </div>
      <div className="dash-card dash-kpi dash-c3" data-testid="kpi-lessons">
        <span className="dash-kpi-label">Lessons</span>
        <span className="dash-kpi-value">{e.lessons.value.toLocaleString('en-US')}</span>
        <span className="dash-kpi-foot"><Delta kpi={e.lessons} /> {e.lessons.previous ? <>was {e.lessons.previous}</> : null}</span>
      </div>
      <div className="dash-card dash-kpi dash-c3" data-testid="kpi-cancellation">
        <span className="dash-kpi-label">Cancellation rate</span>
        <span className="dash-kpi-value">{e.cancellation.value}%</span>
        <span className="dash-kpi-foot"><Delta kpi={e.cancellation} goodWhenDown /> {e.cancellation.cancelled} of {e.cancellation.total} lessons</span>
      </div>
    </div>
  )

  if (tab === 'overview') {
    const maxRevenue = Math.max(1, ...e.buckets.map(b => b.revenue))
    const recent = e.history.slice(0, 6)
    return (
      <div>
        {head}{tabs}{kpis}
        <div className="dash-grid">
          <section className="dash-card dash-c8" aria-labelledby="chart-h">
            <div className="dash-card-h"><h2 id="chart-h">Earned per {e.bucketUnit}</h2><span>{period === 'all' ? 'last 12 months' : periodLabel}</span></div>
            <div className="dash-card-b">
              <div className="dash-bars" role="img" aria-label={`Earned per ${e.bucketUnit}: ${e.buckets.map(b => `${b.label} ${money(b.revenue, true)}`).join(', ')}`}>
                {e.buckets.map(b => (
                  <div key={b.key} className="dash-bar" aria-hidden="true">
                    <em>{b.revenue > 0 ? money(b.revenue, true) : ''}</em>
                    <i style={{ height: `${(b.revenue / maxRevenue) * 100}%`, minHeight: b.revenue > 0 ? 4 : 0 }} />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="dash-card dash-c4" aria-labelledby="top-h">
            <div className="dash-card-h"><h2 id="top-h">Top students</h2><span>by money paid</span></div>
            {e.top.length === 0 ? (
              <p className="dash-card-b" style={{ color: 'var(--d-ink-3)' }}>No lessons in this period.</p>
            ) : (
              <ol className="dash-rank" style={{ paddingTop: 8 }}>
                {e.top.map((s, i) => (
                  <li key={s.id}><Link href={`/students/${s.id}`}>
                    <span style={{ color: 'var(--d-ink-3)', fontWeight: 650 }}>{i + 1}</span>
                    <span><b style={{ fontWeight: 650 }}>{s.name}</b><small>{s.lessons} lessons</small></span>
                    <b style={{ fontWeight: 650 }}>{money(s.revenue, true)}</b>
                  </Link></li>
                ))}
              </ol>
            )}
          </section>
          <section className="dash-card dash-c12" aria-labelledby="recent-h">
            <div className="dash-card-h"><h2 id="recent-h">Recent payments</h2><Link href={href('payments', period, 'all')} style={{ fontSize: 13 }}>See all payments</Link></div>
            <div style={{ paddingTop: 12 }}>{recent.length === 0 ? <p className="dash-card-b" style={{ color: 'var(--d-ink-3)' }}>No priced lessons in this period.</p> : <HistoryTable rows={recent} money={money} />}</div>
          </section>
        </div>
      </div>
    )
  }

  if (tab === 'payments') {
    const rows = filterHistory(e.history, status)
    const shown = rows.slice(0, HISTORY_SHOWN)
    return (
      <div>
        {head}{tabs}{kpis}
        <section className="dash-card" aria-labelledby="hist-h">
          <div className="dash-card-h">
            <h2 id="hist-h">Payment history</h2>
            <nav className="dash-seg" aria-label="Payment status">
              {STATUS_FILTERS.map(s => <Link key={s} href={href('payments', period, s)} aria-current={s === status ? 'true' : undefined} style={{ textTransform: 'capitalize' }}>{s}</Link>)}
            </nav>
          </div>
          <div style={{ paddingTop: 12 }}>
            {shown.length === 0 ? <p className="dash-card-b" style={{ color: 'var(--d-ink-3)' }} data-testid="history-empty">No payments match this period and status.</p> : <HistoryTable rows={shown} money={money} invoices />}
          </div>
          <p className="dash-card-b" style={{ color: 'var(--d-ink-3)', paddingTop: 0 }}>
            {rows.length > HISTORY_SHOWN ? `Showing the latest ${HISTORY_SHOWN} of ${rows.length}. Export CSV has all of them.` : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}.`}
          </p>
        </section>
        <div className="dash-card dash-kpi" style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <b style={{ color: 'var(--d-ink)' }}>Accept card payments with Stripe</b>
            <p style={{ margin: 0, color: 'var(--d-ink-3)' }}>Connect Stripe in Settings so students can pay you by card.</p>
          </div>
          <Link href="/settings?tab=payments" className="dash-btn">Go to Settings</Link>
        </div>
      </div>
    )
  }

  // Reports (Pro)
  const att = attendanceOf(all, now, period)
  const year = now.getFullYear()
  return (
    <div>
      {head}{tabs}{kpis}
      <div className="dash-grid">
        <section className="dash-card dash-c4" aria-labelledby="att-h">
          <div className="dash-card-h"><h2 id="att-h">Attendance</h2><span>{periodLabel}</span></div>
          <div className="dash-card-b">
            <div className="dash-kpi-value" data-testid="attendance-rate">{att.rate}%</div>
            <p style={{ margin: '4px 0 0', color: 'var(--d-ink-3)' }}>{att.completed} held, {att.cancelled} cancelled, {att.noShow} no-show</p>
          </div>
        </section>
        <section className="dash-card dash-c8" aria-labelledby="acc-h">
          <div className="dash-card-h"><h2 id="acc-h">Accounting export</h2></div>
          <div className="dash-card-b">
            <p style={{ margin: '0 0 12px', color: 'var(--d-ink-3)' }}>Download your {year} invoices as a CSV ready to import into Xero or QuickBooks Online. For live sync, connect Tutafy through <Link href="/developers" style={{ color: 'var(--d-brand)' }}>Zapier and webhooks</Link>.</p>
            <div className="dash-head-actions">
              <a className="dash-btn" href={`/api/accounting/export?provider=xero&year=${year}`}><Download className="h-4 w-4" aria-hidden="true" /> Export for Xero</a>
              <a className="dash-btn" href={`/api/accounting/export?provider=quickbooks&year=${year}`}><Download className="h-4 w-4" aria-hidden="true" /> Export for QuickBooks</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

const STATUS_CLASS: Record<string, string> = { pending: 'is-warn', paid: 'is-ok', free: '', refunded: 'is-err' }

function HistoryTable({ rows, money, invoices = false }: { rows: LessonRow[]; money: (n: number) => string; invoices?: boolean }) {
  return (
    <div className="dash-table-wrap overflow-x-auto">
      <table className="dash-table">
        <thead>
          <tr><th>Student</th><th>Date</th><th>Duration</th><th className="is-num">Amount</th><th>Status</th>{invoices && <th><span className="sr-only">Invoice</span></th>}</tr>
        </thead>
        <tbody>
          {rows.map(l => {
            const s = Array.isArray(l.students) ? l.students[0] : l.students
            const st = l.payment_status ?? 'pending'
            return (
              <tr key={l.id}>
                <td><Link href={`/lessons/${l.id}`} style={{ color: 'var(--d-ink)', fontWeight: 600, textDecoration: 'none' }}>{s?.name ?? 'No student'}</Link></td>
                <td>{new Date(l.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>{l.duration_minutes ?? '-'} min</td>
                <td className="is-num">{money(Number(l.price) || 0)}</td>
                <td><span className={`dash-chip ${STATUS_CLASS[st] ?? ''}`}>{st}</span></td>
                {invoices && <td><a href={`/api/invoices/${l.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--d-brand)' }}>Invoice</a></td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
