'use client'

// The Subscription plans list (T-0825): figures on top, the plans as a table (cards on a phone), a form to add one.
// Create, switch on or off, and delete go through /api/subscriptions/plans (Pro, the tutor's own; validatePlan and pickPlanUpdates).
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CircleAlert, Copy, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { PLAN_PERIODS, planCheckoutLink, planStats, validatePlan } from '@/lib/business-lists'
import { StatRow } from '@/components/lists/StatRow'

type Plan = { id: string; name: string; description: string | null; price: number; currency: string; lessons_per_period: number; period: string; duration_minutes: number; is_active: boolean }
const PERIOD_LABEL: Record<string, string> = { month: 'Monthly', week: 'Weekly' }
const BLANK = { name: '', description: '', price: '', lessons_per_period: '4', period: 'month', duration_minutes: '60', currency: 'usd' }

export function SubscriptionsClient() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [slug, setSlug] = useState('')
  const [form, setForm] = useState(BLANK)
  const stats = planStats(plans)

  async function load() {
    try {
      const res = await fetch('/api/subscriptions/plans')
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setFailed(true); return }
      if (d.migrationRequired) { setMigrationRequired(true); return }
      setPlans(d.plans ?? [])
      if (typeof d.slug === 'string') setSlug(d.slug)
    } catch { setFailed(true) } finally { setLoading(false) }
  }

  useEffect(() => {
    void load() // eslint-disable-line react-hooks/set-state-in-effect -- load once on arrival; the state is set when the answer comes back
  }, [])

  async function createPlan() {
    const body = { ...form, price: Number(form.price), lessons_per_period: Number(form.lessons_per_period), duration_minutes: Number(form.duration_minutes) }
    const check = validatePlan(body)
    if (!check.ok) { setError(check.error); return }
    setError(''); setSaving(true)
    try {
      const res = await fetch('/api/subscriptions/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error ?? 'Could not save the plan'); return }
      toast.success('Plan created'); setShowForm(false); setForm(BLANK); await load()
    } finally { setSaving(false) }
  }

  async function deletePlan(plan: Plan) {
    if (!window.confirm(`Delete the plan "${plan.name}"?`)) return
    const res = await fetch('/api/subscriptions/plans', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: plan.id }) })
    if (res.ok) { setPlans(p => p.filter(x => x.id !== plan.id)); toast.success('Plan deleted') } else toast.error('Could not delete the plan')
  }

  async function toggleActive(plan: Plan) {
    const res = await fetch('/api/subscriptions/plans', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }) })
    if (res.ok) setPlans(p => p.map(x => x.id === plan.id ? { ...x, is_active: !x.is_active } : x)); else toast.error('Could not change the plan')
  }

  function copyLink(plan: Plan) {
    void navigator.clipboard.writeText(planCheckoutLink(window.location.origin, slug, plan.id)).then(() => toast.success('Link copied')).catch(() => toast.error('Could not copy the link'))
  }

  if (loading) return <div role="status" className="dash-sk" style={{ height: 240 }}><span className="sr-only">Loading your plans</span></div>

  return (
    <div>
      <div className="dash-head">
        <div><h1>Subscription plans <span className="dash-chip is-brand-chip" style={{ verticalAlign: 'middle', marginLeft: 6 }}>Pro</span></h1><p>Recurring lesson bundles students can sign up for.</p></div>
        {!migrationRequired && <div className="dash-head-actions"><button type="button" className="dash-btn is-primary" onClick={() => setShowForm(s => !s)}><Plus className="h-4 w-4" aria-hidden="true" /> New plan</button></div>}
      </div>
      {failed && <div className="dash-card dash-card-b" role="alert" data-testid="plans-error" style={{ marginBottom: 16, color: 'var(--d-err)', background: 'var(--d-err-soft)' }}>We could not load your plans. Reload the page; nothing was changed.</div>}
      {migrationRequired && (
        <div className="dash-card dash-card-b" role="note" style={{ marginBottom: 16, display: 'flex', gap: 12, background: 'var(--d-warn-soft)' }}>
          <CircleAlert className="h-5 w-5" aria-hidden="true" style={{ color: 'var(--d-warn)', flexShrink: 0 }} />
          <div><b style={{ color: 'var(--d-ink)' }}>Database setup required</b><p style={{ margin: '4px 0 0', color: 'var(--d-ink-2)' }}>Subscription plans need a database step that has not been run for this account yet. Tell support and we will do it.</p></div>
        </div>
      )}

      <StatRow stats={[
        { id: 'total', label: 'Plans', value: String(stats.total) },
        { id: 'active', label: 'On sale', value: String(stats.active), foot: stats.total - stats.active > 0 ? `${stats.total - stats.active} switched off` : undefined },
        { id: 'cheapest', label: 'Lowest price per lesson', value: stats.cheapestPerLesson === null ? '-' : formatMoney(stats.cheapestPerLesson, 'USD') },
      ]} />

      {showForm && (
        <form className="dash-card dash-card-b" aria-label="New subscription plan" onSubmit={e => { e.preventDefault(); void createPlan() }} style={{ marginBottom: 16 }}>
          <div className="set-fields">
            <label style={{ flex: '2 1 240px' }}>Plan name<input className="dash-input" style={{ maxWidth: 'none' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Monthly package" maxLength={80} /></label>
            <label style={{ flex: '1 1 120px' }}>Price<input className="dash-input" style={{ maxWidth: 'none' }} type="number" min={1} step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="200" /></label>
            <label style={{ flex: '1 1 130px' }}>Billed<select className="dash-select" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>{PLAN_PERIODS.map(p => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}</select></label>
            <label style={{ flex: '1 1 120px' }}>Lessons per period<input className="dash-input" style={{ maxWidth: 'none' }} type="number" min={1} max={100} value={form.lessons_per_period} onChange={e => setForm(f => ({ ...f, lessons_per_period: e.target.value }))} /></label>
            <label style={{ flex: '1 1 120px' }}>Minutes each<input className="dash-input" style={{ maxWidth: 'none' }} type="number" min={10} max={240} step={5} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} /></label>
            <label style={{ flex: '3 1 300px' }}>Description (optional)<input className="dash-input" style={{ maxWidth: 'none' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Four weekly lessons" maxLength={300} /></label>
          </div>
          {error && <p role="alert" data-testid="plan-form-error" style={{ margin: '12px 0 0', color: 'var(--d-err)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="dash-btn is-primary" disabled={saving}>{saving ? <><RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving</> : 'Create plan'}</button>
            <button type="button" className="dash-btn" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
          </div>
        </form>
      )}

      {!migrationRequired && (
        <section className="dash-card" aria-label="Plans">
          {plans.length === 0 ? (
            <div className="dash-state" data-testid="plans-empty">
              <h2>No subscription plans yet</h2>
              <p>Create your first plan to offer recurring lessons.</p>
              <div className="dash-state-actions"><button type="button" className="dash-btn is-primary" onClick={() => setShowForm(true)}>Create the first plan</button></div>
            </div>
          ) : (
            <div className="dash-table-wrap overflow-x-auto">
              <table className="dash-table is-cards no-sel">
                <thead><tr><th>Plan</th><th className="is-num">Price</th><th>Billed</th><th className="is-num">Lessons</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id}>
                      <td className="c-main"><b style={{ fontWeight: 650 }}>{p.name}</b>{p.description && <div style={{ color: 'var(--d-ink-3)', fontSize: 13 }}>{p.description}</div>}</td>
                      <td className="is-num c-end">{formatMoney(Number(p.price), p.currency.toUpperCase())}</td>
                      <td className="c-hide">{PERIOD_LABEL[p.period] ?? p.period}</td>
                      <td className="is-num c-hide">{p.lessons_per_period} x {p.duration_minutes} min</td>
                      <td className="c-sub"><span className={`dash-chip ${p.is_active ? 'is-ok' : ''}`}>{p.is_active ? 'On sale' : 'Off'}</span> <span className="dash-m-only">{PERIOD_LABEL[p.period] ?? p.period}, {p.lessons_per_period} lessons of {p.duration_minutes} min</span></td>
                      <td className="is-num c-sub" style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="dash-btn is-ghost" onClick={() => toggleActive(p)}>{p.is_active ? 'Switch off' : 'Switch on'}</button>
                        {slug && p.is_active && <button type="button" className="dash-icon-btn" style={{ display: 'inline-grid' }} onClick={() => copyLink(p)} aria-label={`Copy the checkout link of ${p.name}`}><Copy className="h-4 w-4" aria-hidden="true" /></button>}
                        <button type="button" className="dash-icon-btn" style={{ display: 'inline-grid' }} onClick={() => deletePlan(p)} aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
