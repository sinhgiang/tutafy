'use client'

import { useState } from 'react'
import { Plus, Package, Trash2, Loader2, DollarSign } from 'lucide-react'

type Pkg = {
  id: string
  name: string
  lessons_count: number
  price: number
  description: string | null
  active: boolean
  created_at: string
}

export function PackageManager({ initialPackages }: { initialPackages: Pkg[] }) {
  const [packages, setPackages] = useState<Pkg[]>(initialPackages)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    lesson_count: '',
    price: '',
    description: '',
  })

  async function create() {
    if (!form.name || !form.lesson_count || !form.price) return
    setSaving(true)
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        lessons_count: Number(form.lesson_count),
        price: Number(form.price),
        description: form.description || null,
      }),
    })
    const data = await res.json()
    if (res.ok && data.package) {
      setPackages(prev => [data.package, ...prev])
      setForm({ name: '', lesson_count: '', price: '', description: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function deactivate(id: string) {
    setDeletingId(id)
    await fetch(`/api/packages?id=${id}`, { method: 'DELETE' })
    setPackages(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Packages list */}
      {packages.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Package className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-gray-900">No packages yet</p>
          <p className="text-[13px] text-gray-400 mt-1">Create lesson bundles to sell at a discount</p>
        </div>
      )}

      <div className="space-y-3">
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">{pkg.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {pkg.lessons_count} lessons · ${Number(pkg.price).toFixed(0)} total
                    {pkg.lessons_count > 0 && ` · $${(Number(pkg.price) / pkg.lessons_count).toFixed(0)}/lesson`}
                  </p>
                  {pkg.description && (
                    <p className="text-[12px] text-gray-500 mt-1">{pkg.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[18px] font-bold text-gray-900">${Number(pkg.price).toFixed(0)}</span>
                <button
                  onClick={() => deactivate(pkg.id)}
                  disabled={deletingId === pkg.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {deletingId === pkg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm ? (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <p className="text-[13px] font-semibold text-gray-900">New Package</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Package Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Starter 10 Pack"
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Number of Lessons</label>
              <input
                type="number"
                value={form.lesson_count}
                onChange={e => setForm(f => ({ ...f, lesson_count: e.target.value }))}
                placeholder="10"
                min="1"
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Total Price ($)</label>
              <div className="relative">
                <DollarSign className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="200"
                  min="0"
                  className="w-full text-[13px] pl-7 pr-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Description (optional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Great for beginners, includes materials"
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          {form.lesson_count && form.price && Number(form.lesson_count) > 0 && (
            <div className="bg-indigo-50 rounded-lg p-3 text-[12px] text-indigo-700">
              Per-lesson price: <strong>${(Number(form.price) / Number(form.lesson_count)).toFixed(2)}</strong>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={create}
              disabled={saving || !form.name || !form.lesson_count || !form.price}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {saving ? 'Saving...' : 'Create Package'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-[13px] text-gray-400 hover:text-gray-600 px-3 py-2 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-[13px] font-medium text-indigo-600 bg-white border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl px-4 py-3 w-full transition-colors"
        >
          <Plus className="h-4 w-4" /> New Package
        </button>
      )}
    </div>
  )
}
