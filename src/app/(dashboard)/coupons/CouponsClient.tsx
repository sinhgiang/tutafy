'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Tag, Plus, Trash2, Copy, Check } from 'lucide-react'

interface Coupon {
  id: string; code: string; discount_type: string; discount_value: number
  max_uses: number | null; uses_count: number; expires_at: string | null; active: boolean; created_at: string
}

export function CouponsClient() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/coupons')
    const d = await res.json()
    setCoupons(d.coupons ?? [])
    setLoading(false)
  }

  async function create() {
    if (!code.trim() || !discountValue) { toast.error('Fill code and discount value'); return }
    setSaving(true)
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, discount_type: discountType, discount_value: discountValue, max_uses: maxUses || null, expires_at: expiresAt || null }),
    })
    const d = await res.json()
    setSaving(false)
    if (d.coupon) {
      setCoupons(prev => [d.coupon, ...prev])
      setCode(''); setDiscountValue(''); setMaxUses(''); setExpiresAt('')
      toast.success('Coupon created!')
    } else toast.error(d.error ?? 'Failed')
  }

  async function remove(id: string) {
    await fetch('/api/coupons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setCoupons(prev => prev.filter(c => c.id !== id))
    toast.success('Deleted')
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-[640px] space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Coupon Codes</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Create discount codes to share with students</p>
      </div>

      {/* Create coupon */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-[12px] font-semibold text-gray-700 mb-4">Create new coupon</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5">Coupon code</label>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10"
                className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5">Discount type</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount ($)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5">
                Value {discountType === 'percent' ? '(%)' : '($)'}
              </label>
              <input type="number" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percent' ? '10' : '5'}
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5">Max uses <span className="text-gray-300">(optional)</span></label>
              <input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="∞"
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5">Expires <span className="text-gray-300">(optional)</span></label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
          </div>
          <button onClick={create} disabled={saving || !code.trim() || !discountValue}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-3.5 w-3.5" /> Create coupon
          </button>
        </div>
      </div>

      {/* Coupon list */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
            <Tag className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-[13px] text-gray-400">No coupon codes yet</p>
          <p className="text-[12px] text-gray-300 mt-0.5">Create one above to offer discounts to students</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-400" />
            <p className="text-[13px] font-semibold text-gray-900">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {coupons.map(c => {
              const isExpired = c.expires_at && new Date(c.expires_at) < new Date()
              const isMaxed = c.max_uses !== null && c.uses_count >= c.max_uses
              const inactive = isExpired || isMaxed || !c.active
              return (
                <div key={c.id} className={`flex items-center gap-4 px-5 py-3.5 ${inactive ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold font-mono text-gray-900">{c.code}</span>
                      {inactive && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded font-medium">INACTIVE</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {c.discount_type === 'percent' ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                      {c.max_uses !== null && ` · ${c.uses_count}/${c.max_uses} used`}
                      {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyCode(c.code)}
                      className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                      {copied === c.code ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => remove(c.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <p className="text-[12px] font-semibold text-indigo-900">How coupons work</p>
        <p className="text-[12px] text-indigo-600 mt-1">Share the code with students. They enter it on your booking page before confirming their lesson. The discount is shown before they book.</p>
      </div>
    </div>
  )
}
