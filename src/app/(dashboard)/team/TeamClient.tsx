'use client'

import { PageColumn } from '@/components/layout/PageFrame'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users, Plus, Trash2, Loader2, UserCheck, Wallet, Link as LinkIcon, ChevronDown, Copy } from 'lucide-react'
import type { PayrollResult } from '@/lib/payroll'
import { createClient } from '@/lib/supabase/client'

interface Member { id: string; name: string; email: string | null; pay_type: string; pay_rate: number; active: boolean; slug?: string; bio?: string | null; booking_url_active?: boolean }
interface Assignable { id: string; date: string; student: string; price: number; duration: number; assigned_to: string | null }
interface Slot { id: string; day_of_week: number; start_time: string; end_time: string }

const PAY_TYPES = [
  { value: 'per_lesson', label: 'Per lesson' },
  { value: 'per_hour', label: 'Per hour' },
  { value: 'revenue_share', label: 'Revenue share (%)' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

function payLabel(type: string, rate: number): string {
  if (type === 'per_lesson') return `$${rate}/lesson`
  if (type === 'per_hour') return `$${rate}/hour`
  return `${rate}% of revenue`
}

function MemberBookingPanel({ member, tutorSlug }: { member: Member; tutorSlug: string }) {
  const supabase = createClient()
  const [bio, setBio] = useState(member.bio ?? '')
  const [bookingActive, setBookingActive] = useState(member.booking_url_active ?? true)
  const [savingBio, setSavingBio] = useState(false)
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [newDay, setNewDay] = useState('1')
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('17:00')
  const [savingSlot, setSavingSlot] = useState(false)

  const bookingUrl = tutorSlug && member.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${tutorSlug}/${member.slug}` : ''

  async function loadSlots() {
    const { data } = await supabase.from('availability').select('id, day_of_week, start_time, end_time').eq('team_member_id', member.id).order('day_of_week')
    setSlots(data ?? [])
  }
  if (slots === null) loadSlots()

  async function saveBio() {
    setSavingBio(true)
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio }) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return }
      toast.success('Bio saved')
    } finally { setSavingBio(false) }
  }

  async function toggleBookingActive() {
    const next = !bookingActive
    setBookingActive(next)
    const res = await fetch(`/api/team/${member.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_url_active: next }) })
    if (!res.ok) { setBookingActive(!next); const d = await res.json(); toast.error(d.error ?? 'Failed') }
  }

  async function addSlot() {
    if (newStart >= newEnd) { toast.error('End time must be after start time'); return }
    setSavingSlot(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('availability').insert({
        tutor_id: user.id, team_member_id: member.id, day_of_week: parseInt(newDay), start_time: newStart, end_time: newEnd,
      }).select('id, day_of_week, start_time, end_time').single()
      if (error) { toast.error(error.message); return }
      setSlots(prev => [...(prev ?? []), data].sort((a, b) => a.day_of_week - b.day_of_week))
      toast.success('Slot added')
    } finally { setSavingSlot(false) }
  }

  async function deleteSlot(id: string) {
    await supabase.from('availability').delete().eq('id', id)
    setSlots(prev => (prev ?? []).filter(s => s.id !== id))
  }

  function copyLink() {
    if (!bookingUrl) return
    navigator.clipboard.writeText(bookingUrl)
    toast.success('Booking link copied')
  }

  return (
    <div className="px-5 py-4 bg-gray-50/60 border-t border-gray-50 space-y-4">
      {bookingUrl && (
        <div className="flex items-center gap-2">
          <LinkIcon className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-indigo-600 font-medium truncate hover:underline">{bookingUrl}</a>
          <button onClick={copyLink} className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"><Copy className="h-3.5 w-3.5" /></button>
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500 flex-shrink-0">
            <input type="checkbox" checked={bookingActive} onChange={toggleBookingActive} className="accent-indigo-500" />
            Booking page active
          </label>
        </div>
      )}

      <div>
        <p className="text-[11px] text-gray-400 mb-1.5">Bio (shown on booking page)</p>
        <div className="flex gap-2">
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="A short intro for students"
            className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
          <button onClick={saveBio} disabled={savingBio} className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 px-2">
            {savingBio ? '…' : 'Save'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] text-gray-400 mb-1.5">Weekly availability</p>
        <div className="flex flex-wrap gap-2 items-end mb-2">
          <select value={newDay} onChange={e => setNewDay(e.target.value)} className="text-[12px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white">
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <select value={newStart} onChange={e => setNewStart(e.target.value)} className="text-[12px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white">
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={newEnd} onChange={e => setNewEnd(e.target.value)} className="text-[12px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white">
            {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={addSlot} disabled={savingSlot} className="text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-3 py-1.5 rounded-lg">
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(slots ?? []).length === 0 ? (
            <p className="text-[11px] text-gray-400">No availability set — this tutor's booking page will show a waitlist form.</p>
          ) : (slots ?? []).map(s => (
            <div key={s.id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-medium">
              {DAYS[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
              <button onClick={() => deleteSlot(s.id)} className="hover:text-red-500 transition-colors"><Trash2 className="h-2.5 w-2.5" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TeamClient({ members, payroll, assignable, scope, plan, tutorSlug }: {
  members: Member[]
  payroll: PayrollResult
  assignable: Assignable[]
  scope: 'all' | 'month'
  plan: string
  tutorSlug: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [payType, setPayType] = useState('per_lesson')
  const [payRate, setPayRate] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  const earningsById = new Map(payroll.rows.map(r => [r.memberId, r.earnings]))

  async function addMember() {
    if (!name.trim()) { toast.error('Enter a name'); return }
    const rate = Number(payRate)
    if (!Number.isFinite(rate) || rate < 0) { toast.error('Enter a valid pay rate'); return }
    setBusy('add')
    try {
      const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null, pay_type: payType, pay_rate: rate }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
      setName(''); setEmail(''); setPayRate('')
      toast.success('Team member added')
      router.refresh()
    } finally { setBusy(null) }
  }

  async function removeMember(id: string) {
    setBusy(id)
    try { await fetch(`/api/team/${id}`, { method: 'DELETE' }); toast.success('Removed'); router.refresh() }
    finally { setBusy(null) }
  }

  async function assign(lessonId: string, memberId: string) {
    setBusy(lessonId)
    try {
      const res = await fetch('/api/team/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, memberId: memberId || null }) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  async function recordPayout(memberId: string) {
    const amount = earningsById.get(memberId) ?? 0
    if (amount <= 0) { toast.error('Nothing to pay out yet'); return }
    setBusy('payout-' + memberId)
    try {
      const res = await fetch('/api/team/payout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, amount, note: `Payroll (${scope})` }) })
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return }
      toast.success(`Recorded payout of ${money(amount)}`)
    } finally { setBusy(null) }
  }

  return (
    <PageColumn size="list" className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Team & Payroll</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Add your tutors, assign lessons, and track what each one earns.</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 text-[12px] font-semibold">
          <a href="/team?period=all" className={`px-3 py-1.5 rounded-md transition-colors ${scope === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>All time</a>
          <a href="/team?period=month" className={`px-3 py-1.5 rounded-md transition-colors ${scope === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>This month</a>
        </div>
      </div>

      {plan !== 'academy' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[12px] text-amber-700">
          Team & payroll is an <strong>Academy</strong> feature. You can set it up now — upgrade to Academy to run a full team of tutors.
        </div>
      )}

      {/* Payroll summary */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
          <Wallet className="h-4 w-4 text-violet-500" />
          <h2 className="text-[13px] font-semibold text-gray-900">Payroll — {scope === 'month' ? 'this month' : 'all time'}</h2>
        </div>
        {payroll.rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-gray-400">Add a team member below to start tracking payroll.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-50">
                  <th className="font-medium px-5 py-2.5">Tutor</th>
                  <th className="font-medium px-3 py-2.5 text-right">Lessons</th>
                  <th className="font-medium px-3 py-2.5 text-right">Hours</th>
                  <th className="font-medium px-3 py-2.5 text-right">Revenue</th>
                  <th className="font-medium px-3 py-2.5 text-right">Tutor earns</th>
                  <th className="font-medium px-3 py-2.5 text-right">Academy keeps</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {payroll.rows.map(r => (
                  <tr key={r.memberId} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{r.name}</p>
                      <p className="text-[11px] text-gray-400">{payLabel(r.payType, r.payRate)}</p>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">{r.lessons}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{r.hours}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{money(r.revenue)}</td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-600">{money(r.earnings)}</td>
                    <td className="px-3 py-3 text-right text-gray-600">{money(r.companyShare)}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => recordPayout(r.memberId)} disabled={busy === 'payout-' + r.memberId || r.earnings <= 0}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-gray-300">
                        {busy === 'payout-' + r.memberId ? '…' : 'Mark paid'}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50/60 font-bold text-gray-900">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-3 py-3 text-right">{payroll.totals.lessons}</td>
                  <td className="px-3 py-3 text-right">{payroll.totals.hours}</td>
                  <td className="px-3 py-3 text-right">{money(payroll.totals.revenue)}</td>
                  <td className="px-3 py-3 text-right text-emerald-700">{money(payroll.totals.earnings)}</td>
                  <td className="px-3 py-3 text-right">{money(payroll.totals.companyShare)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team members */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
          <Users className="h-4 w-4 text-gray-400" />
          <h2 className="text-[13px] font-semibold text-gray-900">Team Members</h2>
          <span className="ml-auto text-[11px] text-gray-400">{members.length}/5</span>
        </div>

        {/* Add form */}
        <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[130px]">
            <p className="text-[11px] text-gray-400 mb-1">Name</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tutor name"
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div className="flex-1 min-w-[130px]">
            <p className="text-[11px] text-gray-400 mb-1">Email (optional)</p>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tutor@email.com"
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Pay type</p>
            <select value={payType} onChange={e => setPayType(e.target.value)}
              className="text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
              {PAY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="w-24">
            <p className="text-[11px] text-gray-400 mb-1">{payType === 'revenue_share' ? 'Percent' : 'Rate ($)'}</p>
            <input value={payRate} onChange={e => setPayRate(e.target.value)} type="number" min="0" placeholder={payType === 'revenue_share' ? '70' : '20'}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <button onClick={addMember} disabled={busy === 'add'}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-4 h-9 rounded-lg transition-colors">
            {busy === 'add' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
          </button>
        </div>

        {members.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13px] text-gray-400">No team members yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map(m => (
              <div key={m.id}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-indigo-600">{m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">{m.name}</p>
                    <p className="text-[11px] text-gray-400">{payLabel(m.pay_type, Number(m.pay_rate))}{m.email ? ` · ${m.email}` : ''}</p>
                  </div>
                  <span className="text-[12px] font-bold text-emerald-600">{money(earningsById.get(m.id) ?? 0)}</span>
                  <button onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                    Booking page <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded === m.id ? 'rotate-180' : ''}`} />
                  </button>
                  <button onClick={() => removeMember(m.id)} disabled={busy === m.id} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {expanded === m.id && <MemberBookingPanel member={m} tutorSlug={tutorSlug} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign lessons */}
      {members.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <UserCheck className="h-4 w-4 text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-900">Assign Completed Lessons</h2>
            <span className="ml-auto text-[11px] text-gray-400">Recent {assignable.length}</span>
          </div>
          {assignable.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-gray-400">No completed lessons to assign yet.</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
              {assignable.map(l => (
                <div key={l.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-800 truncate">{l.student}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(l.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {l.duration}m · ${l.price}
                    </p>
                  </div>
                  <select
                    value={l.assigned_to ?? ''}
                    onChange={e => assign(l.id, e.target.value)}
                    disabled={busy === l.id}
                    className="text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 max-w-[160px]">
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageColumn>
  )
}
