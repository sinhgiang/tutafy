'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { User, Globe, Link, CreditCard, Clock, CheckCircle, Wallet, Zap, Calendar, ExternalLink, FileText, Star } from 'lucide-react'
import NextLink from 'next/link'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Ho_Chi_Minh',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
]
const BUFFER_OPTIONS = [
  { v: 0, l: 'No buffer' },
  { v: 5, l: '5 minutes' },
  { v: 10, l: '10 minutes' },
  { v: 15, l: '15 minutes' },
  { v: 30, l: '30 minutes' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [disconnectingGcal, setDisconnectingGcal] = useState(false)
  const [slug, setSlug] = useState('')
  const [stripeConnected, setStripeConnected] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState('free')
  const [form, setForm] = useState({
    name: '', bio: '', timezone: 'UTC',
    cancellation_hours: 24, booking_url_active: true, buffer_minutes: 15,
    paypal_link: '', paddle_checkout_link: '', default_lesson_price: '', custom_domain: '',
    contract_template: '', trial_enabled: false, trial_price: '',
  })

  useEffect(() => {
    if (searchParams.get('stripe') === 'connected') {
      toast.success('Stripe connected successfully!')
    }
    if (searchParams.get('gcal') === 'connected') {
      toast.success('Google Calendar connected!')
    } else if (searchParams.get('gcal') === 'error') {
      toast.error('Google Calendar connection failed')
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('tutors').select('*').eq('id', user.id).single()
      if (data) {
        setSlug(data.slug ?? '')
        setStripeConnected(data.stripe_onboarding_complete ?? false)
        setSubscriptionStatus(data.subscription_status ?? 'free')
        setGcalConnected(!!(data as any).google_calendar_refresh_token)
        setForm({
          name: data.name ?? '',
          bio: data.bio ?? '',
          timezone: data.timezone ?? 'UTC',
          cancellation_hours: data.cancellation_hours ?? 24,
          booking_url_active: data.booking_url_active ?? true,
          buffer_minutes: data.buffer_minutes ?? 15,
          paypal_link: data.paypal_link ?? '',
          paddle_checkout_link: data.paddle_checkout_link ?? '',
          default_lesson_price: data.default_lesson_price ? String(data.default_lesson_price) : '',
          custom_domain: (data as any).custom_domain ?? '',
          contract_template: (data as any).contract_template ?? '',
          trial_enabled: (data as any).trial_enabled ?? false,
          trial_price: (data as any).trial_price ? String((data as any).trial_price) : '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('tutors').update({
      ...form,
      default_lesson_price: form.default_lesson_price ? parseFloat(form.default_lesson_price) : null,
      trial_price: form.trial_price ? parseFloat(form.trial_price) : null,
    }).eq('id', user.id)
    if (error) toast.error(error.message)
    else toast.success('Settings saved!')
    setSaving(false)
  }

  async function connectStripe() {
    setConnectingStripe(true)
    const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else if (data.error === 'Stripe not configured') {
      toast.error('Add STRIPE_SECRET_KEY to Vercel environment variables first.')
    } else {
      toast.error(data.error ?? 'Failed to connect Stripe')
    }
    setConnectingStripe(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-[620px] space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Profile</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Full name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
              Bio <span className="text-gray-400 font-normal">(shown on booking page)</span>
            </label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell your students about yourself..." rows={4}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Timezone</p>
        </div>
        <div className="p-5">
          <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v ?? 'UTC' }))}>
            <SelectTrigger className="text-[13px] border-gray-200"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz} className="text-[13px]">{tz}</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-[11px] text-gray-400 mt-2">All lesson times will be shown in this timezone on your booking page.</p>
        </div>
      </div>

      {/* Booking Page */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Link className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Booking Page</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-900">Booking page active</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Allow students to book lessons online</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, booking_url_active: !f.booking_url_active }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                form.booking_url_active ? 'bg-indigo-500' : 'bg-gray-200'
              }`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                form.booking_url_active ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {slug && (
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <p className="text-[11px] text-gray-400 mb-1">Your booking link</p>
              <p className="text-[12px] font-mono text-indigo-600">tutafy.vercel.app/book/{slug}</p>
            </div>
          )}
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Cancellation notice (hours)</label>
            <input type="number" min={0} max={168} value={form.cancellation_hours}
              onChange={e => setForm(f => ({ ...f, cancellation_hours: parseInt(e.target.value) }))}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            <p className="text-[11px] text-gray-400 mt-1">Students can cancel for free up to this many hours before a lesson</p>
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Scheduling</p>
        </div>
        <div className="p-5">
          <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Buffer time between lessons</label>
          <Select value={String(form.buffer_minutes)} onValueChange={v => setForm(f => ({ ...f, buffer_minutes: parseInt(v ?? '15') }))}>
            <SelectTrigger className="text-[13px] border-gray-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUFFER_OPTIONS.map(b => <SelectItem key={b.v} value={String(b.v)} className="text-[13px]">{b.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-gray-400 mt-2">Prevents back-to-back bookings — adds a gap between lessons on your booking page.</p>
        </div>
      </div>

      {/* Payment Methods — how tutor receives money from students */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Payment Methods</p>
          <span className="text-[11px] text-gray-400 ml-1">— how students pay you</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
              PayPal link <span className="text-gray-400 font-normal">(paypal.me/yourname or your PayPal email)</span>
            </label>
            <input value={form.paypal_link} onChange={e => setForm(f => ({ ...f, paypal_link: e.target.value }))}
              placeholder="https://paypal.me/yourname"
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
              Paddle checkout link <span className="text-gray-400 font-normal">(from your Paddle dashboard)</span>
            </label>
            <input value={form.paddle_checkout_link} onChange={e => setForm(f => ({ ...f, paddle_checkout_link: e.target.value }))}
              placeholder="https://buy.paddle.com/..."
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Stripe Connect</label>
            {stripeConnected ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <p className="text-[13px] text-emerald-700 font-medium">Connected</p>
              </div>
            ) : (
              <button onClick={connectStripe} disabled={connectingStripe}
                className="w-full text-[13px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 transition-colors py-2 rounded-lg">
                {connectingStripe ? 'Redirecting...' : 'Connect Stripe account'}
              </button>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Default lesson price (USD)</label>
            <input type="number" min="0" step="0.01" placeholder="e.g. 25.00" value={form.default_lesson_price}
              onChange={e => setForm(f => ({ ...f, default_lesson_price: e.target.value }))}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            <p className="text-[11px] text-gray-400 mt-1">Shown to students on your booking page</p>
          </div>
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Google Calendar</p>
        </div>
        <div className="p-5 space-y-3">
          {gcalConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-[13px] font-medium text-gray-900">Connected</p>
                  <p className="text-[11px] text-gray-400">New lessons will sync to your Google Calendar</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setDisconnectingGcal(true)
                  await fetch('/api/auth/google-calendar/disconnect', { method: 'POST' })
                  setGcalConnected(false)
                  toast.success('Google Calendar disconnected')
                  setDisconnectingGcal(false)
                }}
                disabled={disconnectingGcal}
                className="text-[12px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] text-gray-500">Sync your lessons to Google Calendar automatically.</p>
              <a
                href="/api/auth/google-calendar"
                className="flex items-center justify-center gap-2 w-full text-[13px] font-semibold text-white bg-[#4285f4] hover:bg-[#3367d6] transition-colors py-2.5 rounded-lg"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 3H4v18h16V3zm-2 14H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z"/>
                </svg>
                Connect Google Calendar
              </a>
              <p className="text-[11px] text-gray-400">Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel env vars.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Contract */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Lesson Contract</p>
          <span className="text-[11px] text-gray-400 ml-1">— optional</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-gray-500">
            Students will be shown this contract and must agree before booking. Leave blank to skip.
          </p>
          <textarea
            value={form.contract_template}
            onChange={e => setForm(f => ({ ...f, contract_template: e.target.value }))}
            rows={6}
            placeholder={`e.g.\n• Payment is due before each lesson\n• 24h cancellation notice required\n• Lessons are for personal use only\n• Materials shared are copyrighted`}
            className="w-full text-[12px] font-mono px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
          />
          {form.contract_template && (
            <p className="text-[11px] text-green-600">
              ✓ Students must check &quot;I agree&quot; before booking a lesson.
            </p>
          )}
        </div>
      </div>

      {/* Trial Lesson */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Star className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Trial Lesson</p>
          <span className="text-[11px] text-gray-400 ml-1">— attract new students</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-900">Offer trial lesson</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Show a discounted first-lesson option on your booking page</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, trial_enabled: !f.trial_enabled }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                form.trial_enabled ? 'bg-indigo-500' : 'bg-gray-200'
              }`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                form.trial_enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {form.trial_enabled && (
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Trial lesson price (USD)</label>
              <input type="number" min="0" step="0.01" placeholder="e.g. 10.00" value={form.trial_price}
                onChange={e => setForm(f => ({ ...f, trial_price: e.target.value }))}
                className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
              <p className="text-[11px] text-gray-400 mt-1">Set lower than your regular price to encourage first bookings</p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Domain (White-label) */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Custom Domain</p>
          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full ml-auto">PRO</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-gray-500">Use your own domain for your booking page (e.g., <span className="font-mono">booking.mariaenglish.com</span>). Your students go to your custom URL instead of tutafy.vercel.app.</p>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Custom domain</label>
            <input value={form.custom_domain} onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))}
              placeholder="booking.yourdomain.com"
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          </div>
          {form.custom_domain && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
              <p className="text-[12px] font-semibold text-blue-800">DNS Setup</p>
              <p className="text-[11px] text-blue-700">Add a CNAME record at your domain registrar:</p>
              <div className="font-mono text-[11px] bg-white border border-blue-100 rounded p-2 mt-1">
                <span className="text-blue-600">{form.custom_domain}</span> → <span className="text-gray-600">cname.vercel-dns.com</span>
              </div>
              <p className="text-[11px] text-blue-600 mt-1">Then add the domain in your Vercel project dashboard → Domains.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tutafy Subscription */}
      <div className={`rounded-xl border overflow-hidden ${subscriptionStatus === 'pro' ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-100'}`}>
        <div className={`px-5 py-4 border-b flex items-center gap-2 ${subscriptionStatus === 'pro' ? 'border-indigo-400' : 'border-gray-50'}`}>
          <Zap className={`h-4 w-4 ${subscriptionStatus === 'pro' ? 'text-indigo-200' : 'text-gray-400'}`} />
          <p className={`text-[13px] font-semibold ${subscriptionStatus === 'pro' ? 'text-white' : 'text-gray-900'}`}>Tutafy Plan</p>
        </div>
        <div className="p-5 space-y-3">
          {subscriptionStatus === 'pro' ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white">Pro Plan — Active</p>
                <p className="text-[11px] text-indigo-200">Unlimited students, AI tools, all features</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-gray-900">Free Plan</p>
                  <p className="text-[11px] text-gray-400">Limited to 10 students · Basic features</p>
                </div>
                <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">Free</span>
              </div>
              <NextLink href="/upgrade"
                className="flex items-center justify-center gap-2 w-full text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors py-2.5 rounded-lg">
                <Zap className="h-3.5 w-3.5" fill="currentColor" /> Upgrade to Pro — $12/month
              </NextLink>
            </>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-[13px] font-semibold py-2.5 rounded-lg transition-colors">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {/* Cron-job.org setup */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <p className="text-[13px] font-semibold text-gray-900">Automated Reminders (cron-job.org)</p>
        </div>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          Set up a free cron job to automatically send lesson reminders to students 24 hours before each lesson.
        </p>
        <ol className="space-y-2 text-[12px] text-gray-600">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            Go to <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline font-medium">cron-job.org</a> and create a free account
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            Create a new cron job with URL: <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-mono">https://tutafy.vercel.app/api/cron/reminders</code>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
            Set schedule to <strong>every hour</strong> (or at 8am daily). Add header: <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-mono">Authorization: Bearer YOUR_CRON_SECRET</code>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
            Add <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[11px] font-mono">CRON_SECRET=YOUR_CRON_SECRET</code> to your Vercel environment variables
          </li>
        </ol>
        <p className="text-[11px] text-gray-400">Students receive email reminders 24h before their lessons automatically.</p>
      </div>
    </div>
  )
}
