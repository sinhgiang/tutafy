'use client'

import { PageColumn } from '@/components/layout/PageFrame'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { User, Globe, Link, CreditCard, Clock, CheckCircle, Wallet, Zap, Calendar, ExternalLink, FileText, Star, Code, Bell, Copy, Check, Plug, X } from 'lucide-react'
import PushSubscribe from '@/components/PushSubscribe'
import NextLink from 'next/link'
import { CustomDomainCard } from './CustomDomainCard'
import { LockedFeature } from '@/components/plan/LockedFeature'
import { stripeErrorMessage } from '@/lib/stripe/availability'
import { cardLinkForSave, safeHttpsUrl } from '@/lib/payment-link'
import { CARD_LINK_HELP_LINKS } from '@/lib/card-link-help'
import { hasPlan } from '@/lib/plans'
import { saveTutorSettings } from '@/lib/settings-save'
import { IntroEditor } from '@/components/IntroEditor'
import { AvatarUploader } from '@/components/settings/AvatarUploader'
import { unfilledParts } from '@/lib/intro-templates'
import { ALL_DURATIONS, MAX_DURATIONS, MIN_DURATION, MAX_DURATION, DURATION_STEP, resolveDurationConfig, toggleDuration, addCustomDuration, chooseDefault, checkDurations } from '@/lib/lesson-durations'

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

type TabId = 'profile' | 'booking' | 'payments' | 'extras' | 'integrations' | 'plan'
const SECTIONS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'booking', label: 'Booking page', icon: Link },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'extras', label: 'Trial & Contract', icon: FileText },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'plan', label: 'Plan', icon: Zap },
]

export default function SettingsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabId>('profile')
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [disconnectingGcal, setDisconnectingGcal] = useState(false)
  const [slug, setSlug] = useState('')
  // the profile photo (T-0766): saved the moment it is chosen, by its own route, so it is not part of `form` or of the Save bar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [cardLinkError, setCardLinkError] = useState('')
  // the Custom box under "Lengths you take" (T-0700)
  const [customLength, setCustomLength] = useState('')
  const [customLengthError, setCustomLengthError] = useState('')
  const [stripeConnected, setStripeConnected] = useState(false)
  // null = still asking the server; false = card payments are switched off
  const [stripeEnabled, setStripeEnabled] = useState<boolean | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState('free')
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [form, setForm] = useState({
    name: '', bio: '', timezone: 'UTC',
    cancellation_hours: 24, booking_url_active: true, buffer_minutes: 15,
    paypal_link: '', paddle_checkout_link: '', default_lesson_price: '',
    contract_template: '', trial_enabled: false, trial_price: '', currency: 'USD',
    // lesson lengths on the booking page: a tutor who chose nothing sees all four, 60 selected first
    lesson_durations: [...ALL_DURATIONS] as number[], default_lesson_duration: 60,
    // the "Made with Tutafy" line on the booking page: true = the tutor turned it off (a paid plan only; migration 021)
    hide_branding: false,
  })
  // Snapshot of the last loaded/saved values → detect unsaved changes for the sticky bar
  const [savedSnapshot, setSavedSnapshot] = useState('')

  useEffect(() => {
    if (searchParams.get('stripe') === 'connected') {
      toast.success('Stripe connected successfully!')
    }
    if (searchParams.get('gcal') === 'connected') {
      toast.success('Google Calendar connected!')
    } else if (searchParams.get('gcal') === 'error') {
      toast.error('Google Calendar connection failed')
    } else if (searchParams.get('gcal') === 'unavailable') {
      toast.message('Google Calendar sync isn\'t enabled on your account yet. Please contact support to turn it on.')
    }
    // Deep-link to a section, e.g. /settings?tab=payments
    const t = searchParams.get('tab') as TabId | null
    if (t && SECTIONS.some(s => s.id === t)) setTab(t)
  }, [])

  // Ask the server whether card payments are switched on, so the Stripe button is
  // replaced by a plain sentence instead of failing on click. Failure keeps the button.
  useEffect(() => {
    fetch('/api/stripe/connect/status')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.enabled === 'boolean') setStripeEnabled(d.enabled) })
      .catch(() => { /* keep the button; the click handler explains any failure */ })
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('tutors').select('*').eq('id', user.id).single()
      if (data) {
        setSlug(data.slug ?? '')
        setAvatarUrl(typeof data.avatar_url === 'string' && data.avatar_url ? data.avatar_url : null)
        setStripeConnected(data.stripe_onboarding_complete ?? false)
        setSubscriptionStatus(data.subscription_status ?? 'free')
        setGcalConnected(!!(data as any).google_calendar_refresh_token)
        const loaded = {
          name: data.name ?? '',
          bio: data.bio ?? '',
          timezone: data.timezone ?? 'UTC',
          cancellation_hours: data.cancellation_hours ?? 24,
          booking_url_active: data.booking_url_active ?? true,
          buffer_minutes: data.buffer_minutes ?? 15,
          paypal_link: data.paypal_link ?? '',
          paddle_checkout_link: data.paddle_checkout_link ?? '',
          default_lesson_price: data.default_lesson_price ? String(data.default_lesson_price) : '',
          contract_template: (data as any).contract_template ?? '',
          trial_enabled: (data as any).trial_enabled ?? false,
          trial_price: (data as any).trial_price ? String((data as any).trial_price) : '',
          currency: (data as any).currency ?? 'USD',
          hide_branding: (data as any).hide_branding === true,
          ...(() => {
            const lengths = resolveDurationConfig(data.lesson_durations, data.default_lesson_duration)
            return { lesson_durations: lengths.durations, default_lesson_duration: lengths.defaultDuration }
          })(),
        }
        setForm(loaded)
        setSavedSnapshot(JSON.stringify(loaded))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    // The card payment link must be https. A refused link sends nothing, so the saved one stays.
    const savedLink = savedSnapshot ? (JSON.parse(savedSnapshot).paddle_checkout_link ?? '') : ''
    const linkCheck = cardLinkForSave(form.paddle_checkout_link, savedLink)
    if (!linkCheck.save) {
      setCardLinkError(linkCheck.message)
      setTab('payments')
      toast.error(linkCheck.message)
      return
    }
    setCardLinkError('')
    // An introduction still holding a template's [bracketed part] would go on the public profile as it is, so a CHANGED bio with one is
    // not saved. A bio the tutor did not touch is never judged here (an old one may hold brackets of its own).
    const savedBio = savedSnapshot ? (JSON.parse(savedSnapshot).bio ?? '') : ''
    if (form.bio !== savedBio && unfilledParts(form.bio).length > 0) {
      setTab('profile')
      toast.error('Your introduction still has parts in [square brackets]. Replace them or delete them, then save.')
      return
    }
    // The lesson lengths must be real ones before anything is saved (the database check of 018 says the same, so a value that
    // got past this is refused there too).
    const lengthCheck = checkDurations(form.lesson_durations)
    if (!lengthCheck.ok) {
      setTab('booking')
      toast.error(lengthCheck.error)
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // The writes (main columns, then currency, "Made with Tutafy" and the lesson lengths, each on its own) live in src/lib/settings-save.ts.
    // A part that fails does not stop the ones after it, and the saved copy only takes what was really written.
    const result = await saveTutorSettings(supabase, user.id, form, savedSnapshot, linkCheck.value)
    setSavedSnapshot(result.snapshot) // only what was written → the bar stays when a part failed
    if (!result.ok) { toast.error(result.message); setSaving(false); return }
    toast.success('Settings saved!')
    setSaving(false)
  }

  async function connectStripe() {
    setConnectingStripe(true)
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      if (data.error === 'stripe_unavailable') setStripeEnabled(false)
      toast.error(stripeErrorMessage(data, 'tutor', 'Failed to connect Stripe'))
    } catch {
      toast.error('Failed to connect Stripe')
    }
    setConnectingStripe(false)
  }

  // Unsaved-changes detection powers the sticky save bar
  // An older saved card link that is not https gets no button on the booking page: say so.
  const savedCardLink: string = savedSnapshot ? (JSON.parse(savedSnapshot).paddle_checkout_link ?? '') : ''
  const savedCardLinkUnusable = savedCardLink.trim() !== '' && safeHttpsUrl(savedCardLink) === null
  const hasChanges = savedSnapshot !== '' && JSON.stringify(form) !== savedSnapshot
  function discardChanges() {
    if (savedSnapshot) setForm(JSON.parse(savedSnapshot))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isPaid = subscriptionStatus === 'pro' || subscriptionStatus === 'academy'
  const planLabel = subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)

  return (
    <PageColumn size="list">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Manage your profile and preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Sub-nav */}
        <nav className="w-full md:w-[190px] flex-shrink-0 md:sticky md:top-4">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 md:w-full ${
                    active
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-indigo-500' : 'text-gray-400'}`} />
                  {label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 w-full md:w-auto space-y-5">

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <p className="text-[13px] font-semibold text-gray-900">Profile</p>
              </div>
              <div className="p-5 space-y-4">
                <AvatarUploader name={form.name} url={avatarUrl} onChange={setAvatarUrl} />
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Full name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
                </div>
                <IntroEditor value={form.bio} onChange={bio => setForm(f => ({ ...f, bio }))} />
              </div>
            </div>
          )}

          {/* ── Booking page ── */}
          {tab === 'booking' && (<>
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
                  <button type="button" role="switch" aria-checked={form.booking_url_active} aria-label="Booking page active" onClick={() => setForm(f => ({ ...f, booking_url_active: !f.booking_url_active }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.booking_url_active ? 'bg-indigo-500' : 'bg-gray-200'
                    }`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      form.booking_url_active ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                {/* "Made with Tutafy" (T-0717): shown for everyone; only a paid plan can switch it off */}
                {(() => {
                  const paid = hasPlan(subscriptionStatus, 'pro')
                  const shown = !(paid && form.hide_branding)
                  return (
                    <div className="flex items-center justify-between gap-4" data-testid="made-with-setting">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">Show &quot;Made with Tutafy&quot; on my booking page</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {paid ? 'A small line under your booking page and the embed window.' : (<>A small line under your booking page. Pro and Academy plans can turn it off. <a href="/upgrade" className="text-indigo-600 font-medium hover:underline">See plans</a></>)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <button type="button" role="switch" aria-checked={shown} aria-label="Show Made with Tutafy on my booking page" disabled={!paid}
                          onClick={() => setForm(f => ({ ...f, hide_branding: !f.hide_branding }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${shown ? 'bg-indigo-500' : 'bg-gray-200'} ${paid ? '' : 'opacity-50 cursor-not-allowed'}`}>
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${shown ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  )
                })()}
                {slug && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-gray-400 mb-1.5">Your booking link</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-mono text-indigo-600 flex-1 truncate">tutafy.com/book/{slug}</p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://tutafy.com/book/${slug}`)
                          setLinkCopied(true)
                          toast.success('Booking link copied!')
                          setTimeout(() => setLinkCopied(false), 2000)
                        }}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                          linkCopied
                            ? 'text-green-600 border-green-200 bg-green-50'
                            : 'text-indigo-600 border-indigo-200 bg-white hover:bg-indigo-50'
                        }`}
                      >
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? 'Copied' : 'Copy'}
                      </button>
                      <a
                        href={`https://tutafy.com/book/${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                    </div>
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

            {/* Lesson lengths */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <p className="text-[13px] font-semibold text-gray-900">Lesson lengths</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p id="lesson-lengths-label" className="block text-[12px] font-medium text-gray-600 mb-1.5">Lengths you take</p>
                  <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="lesson-lengths-label">
                    {ALL_DURATIONS.map(d => {
                      const on = form.lesson_durations.includes(d)
                      return (
                        <button key={d} type="button" role="checkbox" aria-checked={on} aria-label={`${d} minutes`}
                          onClick={() => {
                            setCustomLengthError(!on && form.lesson_durations.length >= MAX_DURATIONS ? `You can offer up to ${MAX_DURATIONS} lesson lengths. Remove one first.` : '')
                            setForm(f => {
                              const next = toggleDuration({ durations: f.lesson_durations, defaultDuration: f.default_lesson_duration }, d)
                              return { ...f, lesson_durations: next.durations, default_lesson_duration: next.defaultDuration }
                            })
                          }}
                          className={`text-[13px] px-5 py-2 rounded-xl font-semibold border transition-colors ${
                            on ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}>
                          {d} min
                        </button>
                      )
                    })}
                  </div>
                  {/* Custom lengths: typed by the tutor, each shown as a ticked button with an x to remove it */}
                  {form.lesson_durations.some(d => !(ALL_DURATIONS as readonly number[]).includes(d)) && (
                    <div className="flex gap-2 flex-wrap mt-2" aria-label="Your custom lengths">
                      {form.lesson_durations.filter(d => !(ALL_DURATIONS as readonly number[]).includes(d)).map(d => (
                        <span key={d} className="inline-flex items-center gap-1.5 text-[13px] pl-4 pr-2 py-2 rounded-xl font-semibold border bg-indigo-500 text-white border-indigo-500 shadow-sm">
                          {d} min
                          <button type="button" aria-label={`Remove ${d} minutes`}
                            disabled={form.lesson_durations.length === 1}
                            onClick={() => { setCustomLengthError(''); setForm(f => {
                              const next = toggleDuration({ durations: f.lesson_durations, defaultDuration: f.default_lesson_duration }, d)
                              return { ...f, lesson_durations: next.durations, default_lesson_duration: next.defaultDuration }
                            }) }}
                            className="h-5 w-5 rounded-full inline-flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-40">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <label htmlFor="custom-length" className="block text-[12px] font-medium text-gray-600 mb-1.5">Custom length (minutes)</label>
                    <div className="flex gap-2 items-start">
                      <input id="custom-length" type="text" inputMode="numeric" autoComplete="off" placeholder="e.g. 75"
                        value={customLength} maxLength={4}
                        aria-describedby="custom-length-help" aria-invalid={customLengthError ? true : undefined}
                        onChange={e => { setCustomLength(e.target.value); setCustomLengthError('') }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('add-custom-length')?.click() } }}
                        className={`w-32 text-[13px] border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${customLengthError ? 'border-red-300' : 'border-gray-200'}`} />
                      <button id="add-custom-length" type="button"
                        disabled={form.lesson_durations.length >= MAX_DURATIONS}
                        onClick={() => {
                          const result = addCustomDuration({ durations: form.lesson_durations, defaultDuration: form.default_lesson_duration }, customLength)
                          if (result.error) { setCustomLengthError(result.error); return }
                          setCustomLengthError('')
                          setCustomLength('')
                          setForm(f => ({ ...f, lesson_durations: result.config.durations, default_lesson_duration: result.config.defaultDuration }))
                        }}
                        className="text-[13px] px-4 py-2 rounded-lg font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40">
                        Add
                      </button>
                    </div>
                    {customLengthError && <p role="alert" className="text-[12px] text-red-600 mt-1.5">{customLengthError}</p>}
                    <p id="custom-length-help" className="text-[11px] text-gray-400 mt-2">
                      {MIN_DURATION} to {MAX_DURATION} minutes, in steps of {DURATION_STEP}. Up to {MAX_DURATIONS} lengths in all.
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">Students can only book the lengths you tick or add. At least one stays.</p>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Length selected first</label>
                  <Select value={String(form.default_lesson_duration)} onValueChange={v => setForm(f => {
                    const next = chooseDefault({ durations: f.lesson_durations, defaultDuration: f.default_lesson_duration }, parseInt(v ?? '60'))
                    return { ...f, default_lesson_duration: next.defaultDuration }
                  })}>
                    <SelectTrigger className="text-[13px] border-gray-200" aria-label="Length selected first"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {form.lesson_durations.map(d => <SelectItem key={d} value={String(d)} className="text-[13px]">{d} minutes</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-gray-400 mt-2">The length that is already picked when a student opens your booking page. It applies to your booking page, the embedded widget and your team members&apos; pages.</p>
                </div>
              </div>
            </div>

            {/* Embed Widget */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <Code className="h-4 w-4 text-gray-400" />
                <p className="text-[13px] font-semibold text-gray-900">Booking Widget</p>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-[13px] text-gray-500">Embed your booking calendar on any website.</p>
                {slug ? (
                  <>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <code className="text-[12px] text-gray-700 break-all">
                        {`<iframe src="https://tutafy.com/embed/${slug}" width="100%" height="700" frameborder="0" style="border:0;border-radius:12px"></iframe>`}
                      </code>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`<iframe src="https://tutafy.com/embed/${slug}" width="100%" height="700" frameborder="0" style="border:0;border-radius:12px"></iframe>`)
                        toast.success('Copied!')
                      }}
                      className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      Copy embed code
                    </button>
                  </>
                ) : (
                  <p className="text-[12px] text-gray-400">Save your settings to generate your embed code.</p>
                )}
              </div>
            </div>

            {/* Custom Domain (White-label) — self-serve via Vercel API */}
            <CustomDomainCard />
          </>)}

          {/* ── Payments ── */}
          {tab === 'payments' && (!isPaid ? (
            <LockedFeature
              required="pro"
              plan={subscriptionStatus as 'free' | 'pro' | 'academy'}
              feature="Payments"
              email={userEmail}
              tutorId={userId}
            />
          ) : (
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
                    Card payment link (Stripe Payment Link)
                  </label>
                  <input value={form.paddle_checkout_link} onChange={e => { setForm(f => ({ ...f, paddle_checkout_link: e.target.value })); setCardLinkError('') }}
                    placeholder="https://buy.stripe.com/..." inputMode="url" aria-invalid={cardLinkError !== ''}
                    className={`w-full text-[13px] px-3 py-2 rounded-lg border bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-colors ${
                      cardLinkError ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400' : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-400'
                    }`} />
                  {cardLinkError ? (
                    <p data-testid="card-link-error" role="alert" className="text-[11px] text-red-600 mt-1">{cardLinkError} Your saved link has not changed.</p>
                  ) : (
                    <p data-testid="card-link-help" className="text-[11px] text-gray-400 mt-1">
                      In your Stripe Dashboard open <a href={CARD_LINK_HELP_LINKS.stripePaymentLinks} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Payment links</a>,
                      create a link for your lesson price, then paste it here. Students will see a &ldquo;Pay by card&rdquo; button on your booking page.
                    </p>
                  )}
                  <p data-testid="card-link-guides" className="text-[11px] text-gray-400 mt-1">
                    New to Stripe?{' '}
                    <a href={CARD_LINK_HELP_LINKS.stepByStepGuide} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Step-by-step guide</a>
                    {' · '}
                    <a href={CARD_LINK_HELP_LINKS.stripeOfficialGuide} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Stripe&apos;s official guide</a>
                  </p>
                {savedCardLinkUnusable && (
                  <p data-testid="card-link-saved-warning" role="status" className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                    The card payment link you saved earlier does not start with https://, so students do not see a &ldquo;Pay by card&rdquo; button. Paste a new https:// link and save.
                  </p>
                )}
                </div>
                {/* Stripe Connect only shows when the platform's Stripe is switched on (or the tutor is already connected). */}
                {(stripeConnected || stripeEnabled === true) && (
                <div data-testid="stripe-connect">
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
                )}
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Default lesson price</label>
                  <input type="number" min="0" step="0.01" placeholder="e.g. 25.00" value={form.default_lesson_price}
                    onChange={e => setForm(f => ({ ...f, default_lesson_price: e.target.value }))}
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
                  <p className="text-[11px] text-gray-400 mt-1">Shown to students on your booking page</p>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Default Currency</label>
                  <select value={form.currency ?? 'USD'} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="AUD">AUD — Australian Dollar (A$)</option>
                    <option value="CAD">CAD — Canadian Dollar (C$)</option>
                    <option value="SGD">SGD — Singapore Dollar (S$)</option>
                    <option value="JPY">JPY — Japanese Yen (¥)</option>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="BRL">BRL — Brazilian Real (R$)</option>
                    <option value="MXN">MXN — Mexican Peso (MX$)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          {/* ── Trial & Contract ── */}
          {tab === 'extras' && (<>
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
                  <button type="button" role="switch" aria-checked={form.trial_enabled} aria-label="Offer trial lesson" onClick={() => setForm(f => ({ ...f, trial_enabled: !f.trial_enabled }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.trial_enabled ? 'bg-indigo-500' : 'bg-gray-200'
                    }`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      form.trial_enabled ? 'translate-x-5' : 'translate-x-0.5'
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
          </>)}

          {/* ── Integrations ── */}
          {tab === 'integrations' && (<>
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
                    <p className="text-[12px] text-gray-500">Sign in with your Google account and every lesson you schedule is added to your Google Calendar automatically. One click — nothing to install.</p>
                    <a
                      href="/api/auth/google-calendar"
                      className="flex items-center justify-center gap-2 w-full text-[13px] font-semibold text-white bg-[#4285f4] hover:bg-[#3367d6] transition-colors py-2.5 rounded-lg"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 3H4v18h16V3zm-2 14H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2z"/>
                      </svg>
                      Connect with Google
                    </a>
                    <p className="text-[11px] text-gray-400">We only ask for calendar access. You can disconnect anytime.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Push Notifications */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-400" />
                <p className="text-[13px] font-semibold text-gray-900">Push Notifications</p>
              </div>
              <div className="p-5 flex items-center gap-3">
                <PushSubscribe />
                <div>
                  <p className="text-[13px] text-gray-700 font-medium">Browser push notifications</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">Get notified instantly when a student messages you, even when Tutafy is not open.</p>
                </div>
              </div>
            </div>
          </>)}

          {/* ── Plan ── */}
          {tab === 'plan' && (
            <div className={`rounded-xl border overflow-hidden ${isPaid ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-100'}`}>
              <div className={`px-5 py-4 border-b flex items-center gap-2 ${isPaid ? 'border-indigo-400' : 'border-gray-50'}`}>
                <Zap className={`h-4 w-4 ${isPaid ? 'text-indigo-200' : 'text-gray-400'}`} />
                <p className={`text-[13px] font-semibold ${isPaid ? 'text-white' : 'text-gray-900'}`}>Tutafy Plan</p>
              </div>
              <div className="p-5 space-y-3">
                {isPaid ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white">{planLabel} Plan — Active</p>
                        <p className="text-[11px] text-indigo-200">
                          {subscriptionStatus === 'academy' ? 'Team, payroll & all Pro features' : 'Unlimited students, AI tools, all features'}
                        </p>
                      </div>
                    </div>
                    <NextLink href="/upgrade" className="text-[12px] font-semibold text-white/80 hover:text-white transition-colors">
                      Manage →
                    </NextLink>
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
          )}

          {/* Sticky save bar — appears only when there are unsaved changes, so you can
              save from anywhere without scrolling (Stripe/Vercel style). */}
          {hasChanges && (
            <div className="sticky bottom-4 z-30">
              <div className="flex items-center gap-3 bg-white/95 backdrop-blur border border-gray-200 shadow-lg shadow-gray-300/40 rounded-xl px-4 py-3">
                <span className="flex items-center gap-2 text-[12px] font-medium text-gray-600 flex-1 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  You have unsaved changes
                </span>
                <button onClick={discardChanges} disabled={saving}
                  className="text-[12px] font-medium text-gray-500 hover:text-gray-800 disabled:opacity-50 px-3 py-2 transition-colors">
                  Discard
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-5 py-2 rounded-lg transition-colors flex-shrink-0">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageColumn>
  )
}
