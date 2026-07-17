'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Copy, Check, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type Plan = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  lessons_per_period: number
  period: string
  duration_minutes: number
  is_active: boolean
}

const PERIODS = [
  { v: 'month', l: 'Monthly' },
  { v: 'week', l: 'Weekly' },
]

export function SubscriptionsClient() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [form, setForm] = useState({
    name: '', description: '', price: '', lessons_per_period: '4',
    period: 'month', duration_minutes: '60', currency: 'usd',
  })

  useEffect(() => {
    load()
    fetch('/api/referral').then(r => r.json()).then(d => {
      if (d.referral_code) setSlug(d.referral_code)
    }).catch(() => {})
  }, [])

  async function load() {
    const res = await fetch('/api/subscriptions/plans')
    const d = await res.json()
    setLoading(false)
    if (d.migrationRequired) { setMigrationRequired(true); return }
    setPlans(d.plans ?? [])
  }

  async function createPlan() {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return }
    setSaving(true)
    const res = await fetch('/api/subscriptions/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: Number(form.price), lessons_per_period: Number(form.lessons_per_period), duration_minutes: Number(form.duration_minutes) }),
    })
    const d = await res.json()
    setSaving(false)
    if (d.error) { toast.error(d.error); return }
    toast.success('Plan created!')
    setShowForm(false)
    setForm({ name: '', description: '', price: '', lessons_per_period: '4', period: 'month', duration_minutes: '60', currency: 'usd' })
    load()
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this plan?')) return
    await fetch('/api/subscriptions/plans', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setPlans(p => p.filter(x => x.id !== id))
    toast.success('Plan deleted')
  }

  async function toggleActive(plan: Plan) {
    await fetch('/api/subscriptions/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, is_active: !plan.is_active }),
    })
    setPlans(p => p.map(x => x.id === plan.id ? { ...x, is_active: !x.is_active } : x))
  }

  function copyLink(plan: Plan) {
    const origin = window.location.origin
    const url = `${origin}/book/${slug}?plan=${plan.id}`
    navigator.clipboard.writeText(url)
    setCopiedId(plan.id)
    toast.success('Link copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const inp = 'w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Create recurring lesson packages for students</p>
        </div>
        {!migrationRequired && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl transition-colors">
            <Plus className="h-4 w-4" /> New Plan
          </button>
        )}
      </div>

      {migrationRequired && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Database setup required</p>
            <p className="text-[12px] text-amber-700 mt-0.5">Run migration 008 in Supabase SQL Editor to enable subscription plans.</p>
            <a href="/admin/migrate" className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-700 hover:text-amber-900 mt-2">
              Go to migration page <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-[14px] font-bold text-gray-900">New Subscription Plan</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Plan name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Monthly Package" className={inp} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Price (USD) *</label>
              <input type="number" min="1" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="200" className={inp} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Period</label>
              <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} className={inp}>
                {PERIODS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Lessons per period</label>
              <input type="number" min="1" value={form.lessons_per_period} onChange={e => setForm(f => ({ ...f, lessons_per_period: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Duration (min)</label>
              <input type="number" min="30" step="15" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className={inp} />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Description (optional)</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="4 weekly 60-min lessons..." className={`${inp} resize-none`} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 text-[13px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 py-2.5 rounded-xl transition-colors">Cancel</button>
            <button onClick={createPlan} disabled={saving}
              className="flex-[2] flex items-center justify-center gap-2 text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 py-2.5 rounded-xl transition-colors">
              {saving ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...</> : 'Create Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Plans list */}
      {!loading && !migrationRequired && plans.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-[14px] font-medium text-gray-500">No subscription plans yet</p>
          <p className="text-[13px] mt-1">Create your first plan to start offering recurring lessons</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-[13px] font-bold text-indigo-500 hover:text-indigo-700">
            + Create first plan
          </button>
        </div>
      )}

      {plans.map(plan => (
        <div key={plan.id} className={`bg-white rounded-2xl border p-5 transition-all ${plan.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold text-gray-900">{plan.name}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {plan.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              {plan.description && <p className="text-[12px] text-gray-400 mt-0.5">{plan.description}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => toggleActive(plan)} className="text-[11px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                {plan.is_active ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => deletePlan(plan.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-gray-500 mb-4">
            <span className="font-bold text-[18px] text-gray-900">${plan.price}</span>
            <span className="text-gray-300">/</span>
            <span>{plan.period}</span>
            <span className="text-gray-300">·</span>
            <span>{plan.lessons_per_period} lessons · {plan.duration_minutes} min each</span>
          </div>
          {slug && (
            <button onClick={() => copyLink(plan)}
              className="flex items-center gap-2 text-[12px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
              {copiedId === plan.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedId === plan.id ? 'Copied!' : 'Copy checkout link'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
