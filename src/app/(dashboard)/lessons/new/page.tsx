'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function NewLessonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    student_id: searchParams.get('student') ?? '',
    starts_at: '',
    duration_minutes: '60',
    price: '',
    zoom_link: '',
    meet_link: '',
    notes: '',
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
    if (!form.student_id) { toast.error('Please select a student'); return }
    if (!form.starts_at) { toast.error('Please set a date and time'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const startsAt = new Date(form.starts_at)
    const endsAt = new Date(startsAt.getTime() + parseInt(form.duration_minutes) * 60 * 1000)

    const { error } = await supabase.from('lessons').insert({
      tutor_id: user.id,
      student_id: form.student_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: parseInt(form.duration_minutes),
      price: form.price ? parseFloat(form.price) : null,
      zoom_link: form.zoom_link || null,
      meet_link: form.meet_link || null,
      notes: form.notes || null,
    })

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Lesson scheduled!')
    router.push('/lessons')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/lessons"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Lesson</h1>
          <p className="text-sm text-gray-500">Add a lesson to your calendar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Lesson Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date & Time *</Label>
                <Input type="datetime-local" value={form.starts_at}
                  onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={form.duration_minutes} onValueChange={v => setForm(f => ({ ...f, duration_minutes: v ?? '60' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[30, 45, 60, 90, 120].map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Meeting Link</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Zoom link</Label>
              <Input placeholder="https://zoom.us/j/..." value={form.zoom_link}
                onChange={e => setForm(f => ({ ...f, zoom_link: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Google Meet link</Label>
              <Input placeholder="https://meet.google.com/..." value={form.meet_link}
                onChange={e => setForm(f => ({ ...f, meet_link: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Lesson plan, topics to cover..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/lessons" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule Lesson'}
          </Button>
        </div>
      </form>
    </div>
  )
}
