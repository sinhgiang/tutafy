'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { User, Link, Wallet, Zap, FileText, Plug } from 'lucide-react'
import { stripeErrorMessage } from '@/lib/stripe/availability'
import { cardLinkForSave, safeHttpsUrl } from '@/lib/payment-link'
import { saveTutorSettings } from '@/lib/settings-save'
import { cleanLevels } from '@/lib/tutor-levels'
import { cleanGroups } from '@/lib/tutor-groups'
import { BookingPreview } from '@/components/settings/BookingPreview'
import { unfilledParts } from '@/lib/intro-templates'
import { ALL_DURATIONS, resolveDurationConfig, checkDurations } from '@/lib/lesson-durations'
import { introVideoFromStored } from '@/lib/intro-video'
import dynamic from 'next/dynamic'
import type { SettingsCtx } from '@/components/settings/sections/context'

/** What a section shows while its file is loading (the first time it is opened). */
const SectionLoading = () => <div role="status" className="dash-sk" style={{ height: 220 }}><span className="sr-only">Loading this section</span></div>
const ProfileSection = dynamic(() => import('@/components/settings/sections/ProfileSection'), { loading: SectionLoading })
const BookingSection = dynamic(() => import('@/components/settings/sections/BookingSection'), { loading: SectionLoading })
const PaymentsSection = dynamic(() => import('@/components/settings/sections/PaymentsSection'), { loading: SectionLoading })
const ExtrasSection = dynamic(() => import('@/components/settings/sections/ExtrasSection'), { loading: SectionLoading })
const IntegrationsSection = dynamic(() => import('@/components/settings/sections/IntegrationsSection'), { loading: SectionLoading })
const PlanSection = dynamic(() => import('@/components/settings/sections/PlanSection'), { loading: SectionLoading })

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
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null)
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
    levels_taught: [] as string[],
    learning_groups: [] as string[],
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
    if (t && SECTIONS.some(s => s.id === t)) setTab(t) // eslint-disable-line react-hooks/set-state-in-effect -- the tab named in the address is applied once, on arrival
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- runs once: the messages and the tab answer the address the page was opened with

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
        setIntroVideoUrl(introVideoFromStored(data.intro_video_url)?.canonical ?? null) // T-0915: a database without migration 028 has no such column: no video
        setStripeConnected(data.stripe_onboarding_complete ?? false)
        setSubscriptionStatus(data.subscription_status ?? 'free')
        setGcalConnected(!!data.google_calendar_refresh_token)
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
          contract_template: data.contract_template ?? '',
          trial_enabled: data.trial_enabled ?? false,
          trial_price: data.trial_price ? String(data.trial_price) : '',
          currency: data.currency ?? 'USD',
          hide_branding: data.hide_branding === true,
          levels_taught: cleanLevels(data.levels_taught),
          learning_groups: cleanGroups(data.learning_groups),
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
  }, [supabase])

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
  // Closing the tab or reloading with unsaved changes asks first (the browser shows its own words).
  useEffect(() => {
    if (!hasChanges) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasChanges])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isPaid = subscriptionStatus === 'pro' || subscriptionStatus === 'academy'
  const planLabel = subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)

  /** Opens a section and puts it in the address (?tab=payments), so a reload or a shared link comes back to it. Nothing typed is lost. */
  function chooseTab(id: TabId) {
    setTab(id)
    try { window.history.replaceState(null, '', `${window.location.pathname}?tab=${id}`) } catch { /* the address is only a convenience */ }
  }

  const ctx: SettingsCtx = {
    form, setForm, savedSnapshot, userId, userEmail, slug, avatarUrl, setAvatarUrl, introVideoUrl, setIntroVideoUrl, linkCopied, setLinkCopied, cardLinkError, setCardLinkError,
    customLength, setCustomLength, customLengthError, setCustomLengthError, stripeConnected, stripeEnabled, connectingStripe, connectStripe,
    gcalConnected, setGcalConnected, disconnectingGcal, setDisconnectingGcal, subscriptionStatus, isPaid, planLabel, savedCardLink, savedCardLinkUnusable, supabase,
  }

  return (
    <div>
      <div className="dash-head">
        <div>
          <h1>Settings</h1>
          <p>Your profile, booking page and payments. The picture on the right shows how students see you.</p>
        </div>
      </div>

      <div className="set-shell">
        {/* Section list */}
        <nav className="set-nav" aria-label="Settings sections">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => chooseTab(id)} aria-current={tab === id ? 'page' : undefined}>
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 w-full md:w-auto space-y-5">

          {/* One section at a time. Each section is its own file and is loaded the first time it is opened; the values stay in this page, so
              switching sections loses nothing that is being typed, and the unsaved-changes bar and the preview read the same form. */}
          {tab === 'profile' && <ProfileSection ctx={ctx} />}
          {tab === 'booking' && <BookingSection ctx={ctx} />}
          {tab === 'payments' && <PaymentsSection ctx={ctx} />}
          {tab === 'extras' && <ExtrasSection ctx={ctx} />}
          {tab === 'integrations' && <IntegrationsSection ctx={ctx} />}
          {tab === 'plan' && <PlanSection ctx={ctx} />}

          {/* The unsaved-changes bar: appears only when something changed, stays in view, and is the one place to save or discard. */}
          {hasChanges && (
            <div className="dash-unsaved" role="region" aria-label="Unsaved changes" data-testid="unsaved-bar">
              <p><i aria-hidden="true" /> You have unsaved changes</p>
              <button type="button" className="dash-btn is-ghost" onClick={discardChanges} disabled={saving}>Discard</button>
              <button type="button" className="dash-btn is-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving' : 'Save changes'}</button>
            </div>
          )}
        </div>

        <BookingPreview form={form} slug={slug} avatarUrl={avatarUrl} />
      </div>
    </div>
  )
}
