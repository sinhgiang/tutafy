'use client'

// The Packages list (T-0825): figures on top, the packages as a table (cards on a phone), a form to add one. A new package and a
// removal go through /api/packages (Pro, the tutor's own); what a package may be is checked there (validatePackage) and here before sending.
import { useState } from 'react'
import { Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/currency'
import { packageStats, validatePackage } from '@/lib/business-lists'
import { StatRow } from '@/components/lists/StatRow'

export type Pkg = { id: string; name: string; lessons_count: number; price: number; description: string | null; active: boolean; created_at: string }

export function PackageManager({ initialPackages, currency, loadFailed = false }: { initialPackages: Pkg[]; currency: string; loadFailed?: boolean }) {
  const [packages, setPackages] = useState<Pkg[]>(initialPackages)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', lesson_count: '', price: '', description: '' })
  const [error, setError] = useState('')
  const stats = packageStats(packages)
  const per = (p: Pkg) => (p.lessons_count > 0 ? Number(p.price) / p.lessons_count : 0)

  async function create() {
    const body = { name: form.name, lessons_count: form.lesson_count, price: form.price, description: form.description }
    const check = validatePackage(body)
    if (!check.ok) { setError(check.error); return }
    setError(''); setSaving(true)
    try {
      const res = await fetch('/api/packages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.package) {
        setPackages(prev => [data.package, ...prev]); setForm({ name: '', lesson_count: '', price: '', description: '' }); setShowForm(false); toast.success('Package created')
      } else setError(data.error ?? 'Could not save the package')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/packages?id=${id}`, { method: 'DELETE' })
      if (res.ok) { setPackages(prev => prev.filter(p => p.id !== id)); toast.success('Package removed') } else toast.error('Could not remove the package')
    } finally { setBusyId(null) }
  }

  return (
    <div>
      <div className="dash-head">
        <div><h1>Lesson packages <span className="dash-chip is-brand-chip" style={{ verticalAlign: 'middle', marginLeft: 6 }}>Pro</span></h1><p>Sell bundles of lessons at a better price per lesson.</p></div>
        <div className="dash-head-actions"><button type="button" className="dash-btn is-primary" onClick={() => setShowForm(s => !s)}><Plus className="h-4 w-4" aria-hidden="true" /> New package</button></div>
      </div>
      {loadFailed && <div className="dash-card dash-card-b" role="alert" data-testid="packages-error" style={{ marginBottom: 16, color: 'var(--d-err)', background: 'var(--d-err-soft)' }}>We could not load your packages. Reload the page; nothing was changed.</div>}

      <StatRow stats={[
        { id: 'count', label: 'Packages on sale', value: String(stats.count) },
        { id: 'lessons', label: 'Lessons across packages', value: String(stats.lessons) },
        { id: 'cheapest', label: 'Lowest price per lesson', value: stats.cheapest === null ? '-' : formatMoney(stats.cheapest, currency) },
        { id: 'dearest', label: 'Highest package price', value: stats.dearest === null ? '-' : formatMoney(stats.dearest, currency, true) },
      ]} />

      {showForm && (
        <form className="dash-card dash-card-b" aria-label="New package" onSubmit={e => { e.preventDefault(); void create() }} style={{ marginBottom: 16 }}>
          <div className="set-fields">
            <label style={{ flex: '2 1 240px' }}>Package name<input className="dash-input" style={{ maxWidth: 'none' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Starter 10 pack" maxLength={80} /></label>
            <label style={{ flex: '1 1 120px' }}>Lessons<input className="dash-input" style={{ maxWidth: 'none' }} type="number" min={1} max={200} value={form.lesson_count} onChange={e => setForm(f => ({ ...f, lesson_count: e.target.value }))} placeholder="10" /></label>
            <label style={{ flex: '1 1 120px' }}>Total price<input className="dash-input" style={{ maxWidth: 'none' }} type="number" min={0} step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="200" /></label>
            <label style={{ flex: '3 1 300px' }}>Description (optional)<input className="dash-input" style={{ maxWidth: 'none' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Great for beginners" maxLength={300} /></label>
          </div>
          {Number(form.lesson_count) > 0 && Number(form.price) > 0 && <p style={{ margin: '12px 0 0', color: 'var(--d-ink-2)' }}>That is <b>{formatMoney(Number(form.price) / Number(form.lesson_count), currency)}</b> per lesson.</p>}
          {error && <p role="alert" data-testid="package-form-error" style={{ margin: '12px 0 0', color: 'var(--d-err)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="dash-btn is-primary" disabled={saving}>{saving ? 'Saving' : 'Create package'}</button>
            <button type="button" className="dash-btn" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
          </div>
        </form>
      )}

      <section className="dash-card" aria-label="Packages">
        {packages.length === 0 ? (
          <div className="dash-state" data-testid="packages-empty">
            <div className="dash-state-ico is-brand"><Package className="h-6 w-6" aria-hidden="true" /></div>
            <h2>No packages yet</h2>
            <p>A package is a bundle of lessons at one price. Students who book a bundle pay less per lesson and come back more often.</p>
            <div className="dash-state-actions"><button type="button" className="dash-btn is-primary" onClick={() => setShowForm(true)}>Create your first package</button></div>
          </div>
        ) : (
          <div className="dash-table-wrap overflow-x-auto">
            <table className="dash-table is-cards no-sel">
              <thead><tr><th>Package</th><th className="is-num">Lessons</th><th className="is-num">Price</th><th className="is-num">Per lesson</th><th><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>
                {packages.map(p => (
                  <tr key={p.id}>
                    <td className="c-main"><b style={{ fontWeight: 650 }}>{p.name}</b>{p.description && <div style={{ color: 'var(--d-ink-3)', fontSize: 13 }}>{p.description}</div>}</td>
                    <td className="is-num c-sub">{p.lessons_count} lessons</td>
                    <td className="is-num c-end">{formatMoney(Number(p.price), currency)}</td>
                    <td className="is-num c-hide">{formatMoney(per(p), currency)}</td>
                    <td className="is-num c-sub"><button type="button" className="dash-icon-btn" style={{ marginLeft: "auto" }} disabled={busyId === p.id} onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
