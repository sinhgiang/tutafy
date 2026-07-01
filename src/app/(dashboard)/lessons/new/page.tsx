'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Plus, X, Users } from 'lucide-react'

const DURATIONS = [30, 45, 60, 90, 120]
const RECURRENCE = [
  { v: 'none', l: 'Does not repeat' },
  { v: 'weekly', l: 'Every week' },
  { v: 'biweekly', l: 'Every 2 weeks' },
  { v: 'monthly', l: 'Every month' },
]

function genMeetLink() {
  const c = 'abcdefghijklmnopqrstuvwxyz'
  const s = (n: number) => Array.from({ length: n }, () => c[Math.floor(Math.random() * c.length)]).join('')
  return `https://meet.google.com/${s(3)}-${s(4)}-${s(3)}`
}

export default function NewLessonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<string[]>([])
  const [newMaterial, setNewMaterial] = useState('')
  const [vocab, setVocab] = useState<{ word: string; def: string }[]>([])
  const [newWord, setNewWord] = useState('')
  const [newDef, setNewDef] = useState('')

  const [form, setForm] = useState({
    student_id: searchParams.get('student') ?? '',
    starts_at: '',
    duration_minutes: '60',
    price: '',
    zoom_link: '',
    meet_link: '',
    notes: '',
    homework: '',
    recurrence: 'none',
    occurrences: '4',
    is_group: false,
    group_max_students: '4',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('students').select('id, name').eq('tutor_id', user.id).eq('status', 'active').order('name')
      setStudents(data ?? [])
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.is_group && !form.student_id) { toast.error('Please select a student'); return }
    if (!form.starts_at) { toast.error('Please set a date and time'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const startsAt = new Date(form.starts_at)
    const dur = parseInt(form.duration_minutes)
    const occurrences = form.recurrence === 'none' ? 1 : Math.min(parseInt(form.occurrences) || 1, 52)
    const intervalDays = form.recurrence === 'weekly' ? 7 : form.recurrence === 'biweekly' ? 14 : form.recurrence === 'monthly' ? 30 : 0

    const lessonData = Array.from({ length: occurrences }, (_, i) => {
      const start = new Date(startsAt.getTime() + i * intervalDays * 86400 * 1000)
      const end = new Date(start.getTime() + dur * 60 * 1000)
      return {
        tutor_id: user.id,
        student_id: form.is_group ? null : form.student_id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        duration_minutes: dur,
        price: form.price ? parseFloat(form.price) : null,
        zoom_link: form.zoom_link || null,
        meet_link: form.meet_link || null,
        notes: form.notes || null,
        homework: form.homework || null,
        vocabulary: vocab.length > 0 ? vocab : [],
        is_group: form.is_group,
        group_max_students: form.is_group ? parseInt(form.group_max_students) : null,
      }
    })

    const { error } = await supabase.from('lessons').insert(lessonData)
    if (error) { toast.error(error.message); setLoading(false); return }
    const count = lessonData.length
    toast.success(count > 1 ? `${count} lessons scheduled!` : 'Lesson scheduled!')
    router.push('/lessons')
    router.refresh()
  }

  function addMaterial() {
    if (!newMaterial.trim()) return
    setMaterials(m => [...m, newMaterial.trim()])
    setNewMaterial('')
  }

  function addVocab() {
    if (!newWord.trim()) return
    setVocab(v => [...v, { word: newWord.trim(), def: newDef.trim() }])
    setNewWord(''); setNewDef('')
  }

  const inp = "w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"

  return (
    <div className="max-w-[660px] space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/lessons" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Schedule Lesson</h1>
          <p className="text-[12px] text-gray-400">Add a lesson to your calendar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lesson Details</p>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_group: !f.is_group }))}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                form.is_group ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Users className="h-3 w-3" /> {form.is_group ? 'Group Class ON' : 'Group Class'}
            </button>
          </div>

          {!form.is_group ? (
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Student *</label>
              <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v ?? '' }))}>
                <SelectTrigger className="text-[13px] border-gray-200"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id} className="text-[13px]">{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : (
            <div className="bg-purple-50 rounded-lg p-3 space-y-2">
              <p className="text-[12px] font-semibold text-purple-700">Group Class Mode</p>
              <p className="text-[11px] text-purple-600">Students will be added from the lesson detail page after creation.</p>
              <div>
                <label className="block text-[11px] font-medium text-purple-600 mb-1">Max students</label>
                <input
                  type="number" min="2" max="20" value={form.group_max_students}
                  onChange={e => setForm(f => ({ ...f, group_max_students: e.target.value }))}
                  className="w-24 text-[13px] px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Date & Time *</label>
              <input type="datetime-local" required value={form.starts_at}
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
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Recurring</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Repeat</label>
              <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v ?? 'none' }))}>
                <SelectTrigger className="text-[13px] border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>{RECURRENCE.map(r => <SelectItem key={r.v} value={r.v} className="text-[13px]">{r.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.recurrence !== 'none' && (
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Number of lessons</label>
                <input type="number" min="2" max="52" value={form.occurrences}
                  onChange={e => setForm(f => ({ ...f, occurrences: e.target.value }))} className={inp} />
              </div>
            )}
          </div>
          {form.recurrence !== 'none' && (
            <div className="bg-indigo-50 rounded-lg px-3 py-2">
              <p className="text-[12px] text-indigo-700">
                Will create <strong>{form.occurrences} lessons</strong> — {RECURRENCE.find(r => r.v === form.recurrence)?.l.toLowerCase()}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Meeting Link</p>
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
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Content</p>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Lesson notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Topics to cover, lesson plan..." className={`${inp} resize-none`} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Homework</label>
            <textarea value={form.homework} onChange={e => setForm(f => ({ ...f, homework: e.target.value }))} rows={2}
              placeholder="Assignment for the student..." className={`${inp} resize-none`} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Materials & Resources</p>
          <div className="flex gap-2">
            <input value={newMaterial} onChange={e => setNewMaterial(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMaterial() } }}
              placeholder="URL or description" className={`flex-1 ${inp}`} />
            <button type="button" onClick={addMaterial}
              className="px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {materials.map((m, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <p className="flex-1 text-[12px] text-gray-700 truncate">{m}</p>
              <button type="button" onClick={() => setMaterials(ms => ms.filter((_, j) => j !== i))}>
                <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          ))}
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
          <Link href="/lessons"
            className="flex-1 text-center text-[13px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors py-2.5 rounded-lg">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition-colors py-2.5 rounded-lg">
            {loading ? 'Scheduling...' : form.recurrence !== 'none' ? `Schedule ${form.occurrences} Lessons` : 'Schedule Lesson'}
          </button>
        </div>
      </form>
    </div>
  )
}
