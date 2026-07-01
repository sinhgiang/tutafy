'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Plus, X } from 'lucide-react'

const DURATIONS = [30, 45, 60, 90, 120]
const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show']
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'free']

function genMeetLink() {
  const c = 'abcdefghijklmnopqrstuvwxyz'
  const s = (n: number) => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('')
  return `https://meet.google.com/${s(3)}-${s(4)}-${s(3)}`
}

function toLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditLessonPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vocab, setVocab] = useState<{ word: string; def: string }[]>([])
  const [newWord, setNewWord] = useState('')
  const [newDef, setNewDef] = useState('')

  const [form, setForm] = useState({
    starts_at: '',
    duration_minutes: '60',
    price: '',
    status: 'scheduled',
    payment_status: 'pending',
    zoom_link: '',
    meet_link: '',
    recording_url: '',
    notes: '',
    homework: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('lessons').select('*').eq('id', id).single()
      if (data) {
        setForm({
          starts_at: toLocal(data.starts_at),
          duration_minutes: String(data.duration_minutes ?? 60),
          price: data.price ? String(data.price) : '',
          status: data.status ?? 'scheduled',
          payment_status: data.payment_status ?? 'pending',
          zoom_link: data.zoom_link ?? '',
          meet_link: data.meet_link ?? '',
          recording_url: data.recording_url ?? '',
          notes: data.notes ?? '',
          homework: data.homework ?? '',
        })
        setVocab(Array.isArray(data.vocabulary) ? data.vocabulary : [])
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const startsAt = new Date(form.starts_at)
    const dur = parseInt(form.duration_minutes)
    const endsAt = new Date(startsAt.getTime() + dur * 60 * 1000)

    const { error } = await supabase.from('lessons').update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: dur,
      price: form.price ? parseFloat(form.price) : null,
      status: form.status,
      payment_status: form.payment_status,
      zoom_link: form.zoom_link || null,
      meet_link: form.meet_link || null,
      recording_url: form.recording_url || null,
      notes: form.notes || null,
      homework: form.homework || null,
      vocabulary: vocab,
    }).eq('id', id)

    if (error) toast.error(error.message)
    else { toast.success('Lesson updated!'); router.push(`/lessons/${id}`) }
    setSaving(false)
  }

  function addVocab() {
    if (!newWord.trim()) return
    setVocab(v => [...v, { word: newWord.trim(), def: newDef.trim() }])
    setNewWord(''); setNewDef('')
  }

  const inp = "w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-[660px] space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/lessons/${id}`} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Edit Lesson</h1>
          <p className="text-[12px] text-gray-400">Update lesson details</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lesson Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Date & Time</label>
              <input type="datetime-local" value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Price (USD)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-2">Duration</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map(d => (
                <button key={d} type="button" onClick={() => setForm(f => ({ ...f, duration_minutes: String(d) }))}
                  className={`text-[13px] px-4 py-1.5 rounded-lg font-medium transition-all ${
                    form.duration_minutes === String(d) ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{d} min</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Status</label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v ?? 'scheduled' }))}>
                <SelectTrigger className="text-[13px] border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-[13px]">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Payment</label>
              <Select value={form.payment_status} onValueChange={v => setForm(f => ({ ...f, payment_status: v ?? 'pending' }))}>
                <SelectTrigger className="text-[13px] border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s} className="text-[13px]">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Meeting & Recording</p>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Zoom link</label>
            <input placeholder="https://zoom.us/j/..." value={form.zoom_link}
              onChange={e => setForm(f => ({ ...f, zoom_link: e.target.value }))} className={inp} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-medium text-gray-600">Google Meet link</label>
              <button type="button" onClick={() => setForm(f => ({ ...f, meet_link: genMeetLink() }))}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700">
                <RefreshCw className="h-3 w-3" /> Auto-generate
              </button>
            </div>
            <input placeholder="https://meet.google.com/..." value={form.meet_link}
              onChange={e => setForm(f => ({ ...f, meet_link: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Recording URL</label>
            <input placeholder="https://... (Zoom recording, YouTube, etc.)" value={form.recording_url}
              onChange={e => setForm(f => ({ ...f, recording_url: e.target.value }))} className={inp} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Content</p>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Lesson notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="What was covered..." className={`${inp} resize-none`} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Homework</label>
            <textarea value={form.homework} onChange={e => setForm(f => ({ ...f, homework: e.target.value }))} rows={2}
              placeholder="Assignment for the student..." className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Vocabulary List</p>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Word / phrase" className={inp} />
            <input value={newDef} onChange={e => setNewDef(e.target.value)} placeholder="Definition / translation" className={inp} />
            <button type="button" onClick={addVocab}
              className="px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {vocab.length > 0 && (
            <div className="divide-y divide-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              {vocab.map((v, i) => (
                <div key={i} className="flex items-center px-3 py-2 bg-white">
                  <span className="text-[13px] font-semibold text-gray-900 w-36 flex-shrink-0">{v.word}</span>
                  <span className="text-[12px] text-gray-500 flex-1">{v.def}</span>
                  <button type="button" onClick={() => setVocab(vs => vs.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5 text-gray-300 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href={`/lessons/${id}`}
            className="flex-1 text-center text-[13px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors py-2.5 rounded-lg">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition-colors py-2.5 rounded-lg">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
