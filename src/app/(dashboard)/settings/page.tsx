'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Ho_Chi_Minh',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', bio: '', timezone: 'UTC',
    cancellation_hours: 24, booking_url_active: true,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('tutors').select('*').eq('id', user.id).single()
      if (data) setForm({
        name: data.name ?? '',
        bio: data.bio ?? '',
        timezone: data.timezone ?? 'UTC',
        cancellation_hours: data.cancellation_hours ?? 24,
        booking_url_active: data.booking_url_active ?? true,
      })
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('tutors').update(form).eq('id', user.id)
    if (error) toast.error(error.message)
    else toast.success('Settings saved!')
    setSaving(false)
  }

  if (loading) return <div className="animate-pulse text-gray-400 text-sm">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Bio (shown on booking page)</Label>
            <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell your students about yourself..." rows={4} />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v ?? 'UTC' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Booking Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Booking page active</p>
              <p className="text-xs text-gray-500">Allow students to book lessons online</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, booking_url_active: !f.booking_url_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.booking_url_active ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.booking_url_active ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <div className="space-y-2">
            <Label>Cancellation notice (hours)</Label>
            <Input type="number" min={0} max={168}
              value={form.cancellation_hours}
              onChange={e => setForm(f => ({ ...f, cancellation_hours: parseInt(e.target.value) }))} />
            <p className="text-xs text-gray-400">How many hours in advance students can cancel</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
