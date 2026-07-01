'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']
const TAGS = ['Business English', 'IELTS', 'TOEFL', 'Conversation', 'Grammar', 'Kids', 'Exam Prep', 'Speaking', 'Writing']

export function StudentForm() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '', email: '', phone: '', country: '', native_language: '',
    level: 'A1', goals: '', notes: '',
  })

  function toggleTag(t: string) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('students').insert({ ...form, tutor_id: user.id, tags })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Student added!')
    router.push('/students')
    router.refresh()
  }

  const field = (label: string, key: keyof typeof form, opts?: { type?: string; placeholder?: string; required?: boolean }) => (
    <div>
      <label className="block text-[12px] font-medium text-gray-600 mb-1.5">{label}{opts?.required && ' *'}</label>
      <input
        type={opts?.type ?? 'text'}
        required={opts?.required}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
      />
    </div>
  )

  return (
    <div className="max-w-[620px] space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/students" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Add Student</h1>
          <p className="text-[12px] text-gray-400">Fill in the student details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Basic Info</p>
          {field('Full name', 'name', { placeholder: 'John Smith', required: true })}
          <div className="grid grid-cols-2 gap-4">
            {field('Email', 'email', { type: 'email', placeholder: 'john@example.com' })}
            {field('Phone', 'phone', { placeholder: '+1 234 567 8900' })}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Country', 'country', { placeholder: 'Japan' })}
            {field('Native language', 'native_language', { placeholder: 'Japanese' })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Learning Profile</p>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Current level</label>
            <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v ?? 'A1' }))}>
              <SelectTrigger className="text-[13px] border-gray-200"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l} className="text-[13px]">{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Learning goals</label>
            <textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={3}
              placeholder="Prepare for IELTS, improve business communication..."
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(t => (
                <button key={t} type="button" onClick={() => toggleTag(t)}
                  className={`text-[12px] px-3 py-1 rounded-full border font-medium transition-colors ${
                    tags.includes(t) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Private notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            placeholder="Notes only you can see..."
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
        </div>

        <div className="flex gap-3">
          <Link href="/students"
            className="flex-1 text-center text-[13px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors py-2.5 rounded-lg">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 transition-colors py-2.5 rounded-lg">
            {loading ? 'Adding...' : 'Add Student'}
          </button>
        </div>
      </form>
    </div>
  )
}
