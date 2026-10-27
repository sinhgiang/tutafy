'use client'

// The Coupons list (T-0825): figures on top, the codes as a table (cards on a phone), a form to create one. Create and delete go
// through /api/coupons (Pro, the tutor's own); the rules for a code are validateCoupon, checked here before sending and again there.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Plus, Tag, Trash2 } from 'lucide-react'
import { couponState, couponStats, validateCoupon, type CouponState } from '@/lib/business-lists'
import { StatRow } from '@/components/lists/StatRow'

interface Coupon { id: string; code: string; discount_type: string; discount_value: number; max_uses: number | null; uses_count: number; expires_at: string | null; active: boolean; created_at: string }
const STATE_CHIP: Record<CouponState, string> = { active: 'is-ok', expired: 'is-err', 'used up': 'is-warn', off: '' }

export function CouponsClient() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const now = new Date()
  const stats = couponStats(coupons, now)

  async function load() {
    try {
      const res = await fetch('/api/coupons')
      if (!res.ok) throw new Error('load')
      setCoupons((await res.json()).coupons ?? [])
    } catch { setFailed(true) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/set-state-in-effect -- load once on arrival; the state is set when the answer comes back

  async function create() {
    const body = { code, discount_type: discountType, discount_value: discountValue, max_uses: maxUses || null, expires_at: expiresAt || null }
    const check = validateCoupon(body)
    if (!check.ok) { setError(check.error); return }
    setError(''); setSaving(true)
    try {
      const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if (d.coupon) { setCoupons(prev => [d.coupon, ...prev]); setCode(''); setDiscountValue(''); setMaxUses(''); setExpiresAt(''); toast.success('Coupon created') }
      else setError(d.error ?? 'Could not save the coupon')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    const res = await fetch('/api/coupons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) { setCoupons(prev => prev.filter(c => c.id !== id)); toast.success('Coupon deleted') } else toast.error('Could not delete the coupon')
  }

  function copyCode(c: string) {
    void navigator.clipboard.writeText(c).then(() => { setCopied(c); setTimeout(() => setCopied(null), 1500) }).catch(() => toast.error('Could not copy the code'))
  }

  if (loading) return <div role="status" className="dash-sk" style={{ height: 240 }}><span className="sr-only">Loading your coupons</span></div>

  return (
    <div>
      <div className="dash-head">
        <div><h1>Coupon codes <span className="dash-chip is-brand-chip" style={{ verticalAlign: 'middle', marginLeft: 6 }}>Pro</span></h1><p>Discount codes students enter on your booking page.</p></div>
      </div>
      {failed && <div className="dash-card dash-card-b" role="alert" data-testid="coupons-error" style={{ marginBottom: 16, color: 'var(--d-err)', background: 'var(--d-err-soft)' }}>We could not load your coupons. Reload the page; nothing was changed.</div>}

      <StatRow stats={[
        { id: 'active', label: 'Active codes', value: String(stats.active), foot: `${stats.total} in all` },
        { id: 'redeemed', label: 'Times used', value: String(stats.redeemed) },
        { id: 'soon', label: 'Expiring in 30 days', value: String(stats.expiringSoon) },
      ]} />

      <form className="dash-card dash-card-b" aria-label="New coupon" onSubmit={e => { e.preventDefault(); void create() }} style={{ marginBottom: 16 }}>
        <div className="set-fields" style={{ alignItems: 'end' }}>
          <label style={{ flex: '1 1 160px' }}>Code<input className="dash-input" style={{ maxWidth: 'none', fontFamily: 'monospace' }} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" maxLength={24} /></label>
          <label style={{ flex: '1 1 150px' }}>Discount<select className="dash-select" value={discountType} onChange={e => setDiscountType(e.target.value as 'percent' | 'fixed')}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label style={{ flex: '1 1 110px' }}>{discountType === 'percent' ? 'Percent off' : 'Amount off'}<input className="dash-input" style={{ maxWidth: 'none' }} type="number" min={0} step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percent' ? '10' : '5'} /></label>
          <label style={{ flex: '1 1 110px' }}>Max uses (optional)<input className="dash-input" style={{ maxWidth: 'none' }} type="number" min={1} value={maxUses} onChange={e => setMaxUses(e.target.value)} /></label>
          <label style={{ flex: '1 1 150px' }}>Expires (optional)<input className="dash-input" style={{ maxWidth: 'none' }} type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></label>
          <button type="submit" className="dash-btn is-primary" disabled={saving}><Plus className="h-4 w-4" aria-hidden="true" /> Create coupon</button>
        </div>
        {error && <p role="alert" data-testid="coupon-form-error" style={{ margin: '12px 0 0', color: 'var(--d-err)' }}>{error}</p>}
      </form>

      <section className="dash-card" aria-label="Coupons">
        {coupons.length === 0 ? (
          <div className="dash-state" data-testid="coupons-empty">
            <div className="dash-state-ico is-brand"><Tag className="h-6 w-6" aria-hidden="true" /></div>
            <h2>No coupon codes yet</h2>
            <p>Create one above. Share the code with a student and they enter it on your booking page before they confirm.</p>
          </div>
        ) : (
          <div className="dash-table-wrap overflow-x-auto">
            <table className="dash-table is-cards no-sel">
              <thead><tr><th>Code</th><th>Discount</th><th className="is-num">Used</th><th>Expires</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {coupons.map(c => {
                  const st = couponState(c, now)
                  return (
                    <tr key={c.id}>
                      <td className="c-main"><b style={{ fontFamily: 'monospace', fontSize: 15 }}>{c.code}</b></td>
                      <td className="c-end">{c.discount_type === 'percent' ? `${c.discount_value}% off` : `${c.discount_value} off`}</td>
                      <td className="is-num c-hide">{c.max_uses !== null ? `${c.uses_count} of ${c.max_uses}` : c.uses_count}</td>
                      <td className="c-hide">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}</td>
                      <td className="c-sub"><span className={`dash-chip ${STATE_CHIP[st]}`}>{st}</span> <span className="dash-m-only">{c.uses_count} used{c.expires_at ? `, expires ${new Date(c.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</span></td>
                      <td className="is-num c-sub" style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="dash-icon-btn" style={{ display: 'inline-grid' }} onClick={() => copyCode(c.code)} aria-label={`Copy ${c.code}`}>{copied === c.code ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}</button>
                        <button type="button" className="dash-icon-btn" style={{ display: 'inline-grid' }} onClick={() => remove(c.id)} aria-label={`Delete ${c.code}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
