'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Zap, User, Clock, Share2, Check, ChevronRight, Copy, RefreshCw } from 'lucide-react'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Toronto',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Asia/Shanghai', 'Asia/Singapore', 'Asia/Ho_Chi_Minh', 'Australia/Sydney', 'UTC',
]
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [slug, setSlug] = useState('')
  const [form, setForm] = useState({ name: '', bio: '', timezone: 'America/New_York' })
  const [availDays, setAvailDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('tutors').select('name, bio, slug, timezone').eq('id', user.id).single()
      if (data) {
        setForm({ name: data.name ?? '', bio: data.bio ?? '', timezone: data.timezone ?? 'America/New_York' })
        setSlug(data.slug ?? '')
        // If tutor already has bio and availability, skip onboarding
        if (data.bio) {
          const { data: av } = await supabase.from('availability').select('id').eq('tutor_id', user.id).limit(1)
          if (av && av.length > 0) { router.push('/dashboard'); return }
        }
      }
    }
    load()
  }, [])

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('tutors').update({
      name: form.name,
      bio: form.bio,
      timezone: form.timezone,
    }).eq('id', user.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setStep(2)
  }

  async function saveAvailability() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Delete existing and re-insert
    await supabase.from('availability').delete().eq('tutor_id', user.id)
    if (availDays.length > 0) {
      await supabase.from('availability').insert(
        availDays.map(day => ({
          tutor_id: user.id,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          is_available: true,
        }))
      )
    }
    setSaving(false)
    setStep(3)
  }

  function copyLink() {
    const link = `https://tutafy.com/book/${slug}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inp = 'w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Zap className="h-6 w-6 text-white" fill="white" />
          </div>
          <h1 className="text-[22px] font-bold text-gray-900">Welcome to Tutafy!</h1>
          <p className="text-[13px] text-gray-400 mt-1">Let&apos;s get your tutor profile ready in 3 steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                s < step ? 'bg-green-500 text-white' : s === step ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {s < step ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-indigo-500" />
              <p className="text-[14px] font-bold text-gray-900">Your Profile</p>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Full name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Maria Santos" className={inp} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Bio <span className="text-gray-400 font-normal">(shown to students on your booking page)</span></label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4}
                placeholder="I'm a certified English teacher with 5 years of experience specializing in business communication and IELTS preparation..."
                className={`${inp} resize-none`} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Your timezone</label>
              <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                className={inp}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <button onClick={saveProfile} disabled={saving || !form.name}
              className="w-full flex items-center justify-center gap-2 text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 py-2.5 rounded-xl transition-colors">
              {saving ? 'Saving...' : <>Next <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        )}

        {/* Step 2: Availability */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-indigo-500" />
              <p className="text-[14px] font-bold text-gray-900">Your Availability</p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-gray-600 mb-2">Which days are you available?</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button key={day} type="button"
                    onClick={() => setAvailDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                    className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      availDays.includes(day) ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                    }`}>
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Start time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">End time</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400">You can fine-tune your schedule in Settings → Availability later.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 text-[13px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 py-2.5 rounded-xl transition-colors">Back</button>
              <button onClick={saveAvailability} disabled={saving || availDays.length === 0}
                className="flex-[2] flex items-center justify-center gap-2 text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 py-2.5 rounded-xl transition-colors">
                {saving ? 'Saving...' : <>Next <ChevronRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Share */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="h-4 w-4 text-indigo-500" />
              <p className="text-[14px] font-bold text-gray-900">Share Your Booking Link</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-[14px] font-bold text-gray-900">You&apos;re all set! 🎉</p>
              <p className="text-[12px] text-gray-500">Share your booking link and start getting students</p>
            </div>
            {slug && (
              <div>
                <p className="text-[12px] font-medium text-gray-600 mb-2">Your booking link</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <p className="text-[12px] text-indigo-600 font-mono flex-1 truncate">
                    tutafy.com/book/{slug}
                  </p>
                  <button onClick={copyLink}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 flex-shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => router.push('/dashboard')}
                className="w-full text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 py-2.5 rounded-xl transition-colors">
                Go to Dashboard →
              </button>
              <button onClick={() => router.push('/availability')}
                className="w-full text-[13px] font-medium text-gray-500 hover:text-gray-700 py-2 transition-colors">
                Set detailed availability
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
