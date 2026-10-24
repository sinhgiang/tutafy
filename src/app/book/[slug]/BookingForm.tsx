'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { CheckCircle, ChevronLeft, ChevronRight, Globe, ExternalLink, RefreshCw, FileText, Package, Tag, Users, Gift, Zap, CalendarClock, CalendarCheck, CalendarX, ArrowRight, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { stripeErrorMessage } from '@/lib/stripe/availability'
import { buildPaymentMethods, cardPaymentUrl, paypalUrl, showBuiltInCardCheckout } from '@/lib/payment-methods'
import { formatMoney } from '@/lib/currency'
import { ALL_DURATIONS, FALLBACK_DEFAULT } from '@/lib/lesson-durations'
import { DEFAULT_FROM_ADDRESS, spamHintFor } from '@/lib/email-config'
import { getSlots } from '@/lib/booking-slots'
import { dayLabel, formatClock, safeZone, firstNameOf, priceLabel } from '@/lib/tutor-profile'

const CARD_BOX = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

// "Continue with Google" — signs the student in, then returns to this booking
// page with their name + email pre-filled (handled server-side via the session).
function GoogleContinueButton({ slug, label = 'Continue with Google' }: { slug: string; label?: string }) {
  const [loading, setLoading] = useState(false)
  async function go() {
    setLoading(true)
    // Carry role + destination in cookies; keep redirectTo as the plain
    // allowlisted callback so Supabase doesn't bounce to the homepage.
    document.cookie = `tutafy_oauth_role=student; path=/; max-age=600; samesite=lax`
    document.cookie = `tutafy_oauth_next=${encodeURIComponent(`/book/${slug}`)}; path=/; max-age=600; samesite=lax`
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <button type="button" onClick={go} disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60">
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      {loading ? 'Redirecting...' : label}
    </button>
  )
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const durationLabel = (v: number) => `${v} min`

interface Availability { day_of_week: number; start_time: string; end_time: string }

interface Tutor {
  id: string; slug?: string; name: string; timezone: string; cancellation_hours: number; buffer_minutes?: number
  paypal_link?: string; paddle_checkout_link?: string; stripe_account_id?: string
  default_lesson_price?: number; currency?: string
}

function toDS(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function convertSlot(dateStr: string, slotHHMM: string, tutorTz: string, studentTz: string): string {
  if (tutorTz === studentTz) return slotHHMM
  try {
    const ref = new Date(`${dateStr}T${slotHHMM}:00.000Z`)
    const tutorParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tutorTz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(ref)
    const tutorH = parseInt(tutorParts.find(p => p.type === 'hour')?.value ?? '0') % 24
    const tutorM = parseInt(tutorParts.find(p => p.type === 'minute')?.value ?? '0')
    const [wantH, wantM] = slotHHMM.split(':').map(Number)
    const diffMs = ((wantH * 60 + wantM) - (tutorH * 60 + tutorM)) * 60000
    const adjusted = new Date(ref.getTime() + diffMs)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: studentTz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(adjusted)
    const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') % 24
    const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  } catch {
    return slotHHMM
  }
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Payment methods panel shown after booking is confirmed
// What the booking route saved the lesson at: the amount the card checkout charges, in the tutor's currency.
type BookedPrice = { price: number | null; currency: string }

function PaymentPanel({ tutor, booked, duration, lessonId, portalToken, cardCheckoutEnabled }: {
  tutor: Tutor; booked: BookedPrice; cardCheckoutEnabled: boolean; duration: number; lessonId?: string | null; portalToken?: string | null
}) {
  const [payingCard, setPayingCard] = useState(false)
  // Not tutor.default_lesson_price: a trial lesson or a coupon changes the price the lesson is saved at.
  const price = booked.price
  // PayPal and the tutor's own card payment link (Stripe Payment Link); both show if both are set.
  const methods = buildPaymentMethods(tutor)

  const showStripeCard = showBuiltInCardCheckout(tutor, lessonId, price, cardCheckoutEnabled)

  if (methods.length === 0 && !showStripeCard) return null

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <p className="text-[13px] font-semibold text-gray-900">Pay for your lesson</p>
        {price && (
          <p className="text-[12px] text-gray-500 mt-0.5">
            {formatMoney(price, booked.currency)} · {duration} min session
          </p>
        )}
      </div>
      <div className="p-4 space-y-2.5">
        {methods.map(m => (
          <a key={m.key} href={m.link} target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-[13px] font-semibold transition-colors ${m.color}`}>
            <span>{m.label}</span>
            <span className="flex items-center gap-1.5 text-[12px] font-normal opacity-80">
              {m.hint} <ExternalLink className="h-3 w-3" />
            </span>
          </a>
        ))}
        {showStripeCard && (
          <button
            onClick={async () => {
              setPayingCard(true)
              try {
                const res = await fetch('/api/stripe/checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  // Only the lesson and the student's token: the server reads the amount and currency itself.
                  body: JSON.stringify({ lessonId, portalToken }),
                })
                const data = await res.json()
                if (data.url) {
                  window.location.href = data.url
                } else {
                  toast.error(stripeErrorMessage(data, 'student', 'Card payment unavailable'))
                  setPayingCard(false)
                }
              } catch {
                toast.error('Card payment unavailable')
                setPayingCard(false)
              }
            }}
            disabled={payingCard}
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl text-[14px] font-semibold transition-colors"
          >
            {payingCard ? 'Redirecting...' : 'Pay by Card'}
          </button>
        )}
        <p className="text-[12px] text-gray-500 text-center pt-1">
          You will pay directly to the tutor. Tutafy does not process this payment.
        </p>
      </div>
    </div>
  )
}

export interface SubscriptionPlan { id: string; name: string; description: string | null; price: number; currency: string; lessons_per_period: number; period: string; duration_minutes: number }
export interface LessonPackage { id: string; name: string; description: string | null; lessons_count: number; price: number }

function PackagePanel({ packages, tutor, name, email }: { packages: LessonPackage[]; tutor: Tutor; name: string; email: string }) {
  function buyUrl(pkg: LessonPackage): string {
    if (tutor.paypal_link) {
      return `${paypalUrl(tutor.paypal_link)}/${pkg.price.toFixed(2)}`
    }
    return cardPaymentUrl(tutor) ?? '#'
  }

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-emerald-50 flex items-center gap-2">
        <Package className="h-4 w-4 text-emerald-500" />
        <p className="text-[13px] font-semibold text-gray-900">Lesson packages</p>
        <span className="text-[12px] text-gray-500 ml-1">— save by buying in bulk</span>
      </div>
      <div className="p-4 space-y-3">
        {packages.map(pkg => {
          const perLesson = formatMoney(pkg.price / pkg.lessons_count, tutor.currency)
          const url = buyUrl(pkg)
          return (
            <div key={pkg.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{pkg.name}</p>
                <p className="text-[12px] text-gray-500 mt-0.5">{pkg.lessons_count} lessons · {perLesson}/lesson</p>
                {pkg.description && <p className="text-[12px] text-gray-500 mt-0.5">{pkg.description}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[15px] font-black text-gray-900">{formatMoney(pkg.price, tutor.currency)}</p>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  onClick={() => { if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return } }}
                  className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors">
                  Buy <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )
        })}
        <p className="text-[12px] text-gray-500 text-center">One-time payment · Paid directly to tutor</p>
      </div>
    </div>
  )
}

function SubscriptionPanel({ plans, highlightId = null, tutor, name, email, onSubscribing }: { plans: SubscriptionPlan[]; highlightId?: string | null; tutor: Tutor; name: string; email: string; onSubscribing: (v: boolean) => void }) {
  const [loading, setLoading] = useState<string | null>(null)
  // A tutor's link for one plan (?plan=<id>, T-0841) brings the student to the plans with that one marked.
  useEffect(() => { if (highlightId) document.getElementById('subscribe')?.scrollIntoView({ block: 'center' }) }, [highlightId])

  async function subscribe(plan: SubscriptionPlan) {
    if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return }
    setLoading(plan.id)
    onSubscribing(true)
    const res = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id, student_name: name, student_email: email, tutor_slug: tutor.slug }),
    })
    const d = await res.json()
    onSubscribing(false)
    setLoading(null)
    if (d.url) window.location.assign(d.url)
    else toast.error(stripeErrorMessage(d, 'student', 'Failed to start checkout'))
  }

  return (
    <div id="subscribe" className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden scroll-mt-4">
      <div className="px-5 py-4 border-b border-indigo-50 flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-indigo-400" />
        <p className="text-[13px] font-semibold text-gray-900">Subscribe for recurring lessons</p>
      </div>
      <div className="p-4 space-y-3">
        {plans.map(plan => (
          <div key={plan.id} data-highlighted={plan.id === highlightId ? 'true' : undefined} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${plan.id === highlightId ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'bg-gray-50'}`}>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-gray-900">{plan.name}</p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {plan.lessons_per_period} lessons/{plan.period} · {plan.duration_minutes} min each
              </p>
              {plan.description && <p className="text-[12px] text-gray-500 mt-0.5">{plan.description}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[15px] font-black text-gray-900">{formatMoney(plan.price, plan.currency)}<span className="text-[12px] font-normal text-gray-500">/{plan.period}</span></p>
              <button onClick={() => subscribe(plan)} disabled={loading === plan.id}
                className="mt-1 text-[12px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors">
                {loading === plan.id ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          </div>
        ))}
        <p className="text-[12px] text-gray-500 text-center">Recurring payment · Cancel anytime</p>
      </div>
    </div>
  )
}

function WaitlistForm({ tutorId, onJoined, tutorSlug = '', prefillName = '', prefillEmail = '' }: { tutorId: string; onJoined: () => void; tutorSlug?: string; prefillName?: string; prefillEmail?: string }) {
  const [name, setName] = useState(prefillName)
  const [email, setEmail] = useState(prefillEmail)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const signedIn = Boolean(prefillEmail)

  async function join() {
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tutor_id: tutorId, name, email, message }),
    })
    setLoading(false)
    if (res.ok) onJoined()
    else if (res.status === 429) toast.error('Too many sign-ups right now. Please try again in a few minutes.')
    else toast.error('Failed to join waitlist')
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-50 flex items-center gap-2">
        <Users className="h-4 w-4 text-amber-500" />
        <p className="text-[13px] font-semibold text-gray-900">Join the waitlist</p>
        <span className="text-[12px] text-gray-500 ml-1">— we&apos;ll notify you when slots open</span>
      </div>
      <div className="p-5 space-y-3">
        {!signedIn && (
          <>
            <GoogleContinueButton slug={tutorSlug} label="Continue with Google — auto-fill" />
            <div className="relative py-0.5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-[12px] text-gray-500">or enter manually</span></div>
            </div>
          </>
        )}
        {signedIn && (
          <div className="flex items-center gap-2 text-[12px] text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle className="h-3.5 w-3.5" /> Signed in as {prefillEmail}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Full name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith"
              className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com"
              className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-colors" />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Message <span className="text-gray-500 font-normal">(optional)</span></label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
            placeholder="What are you looking to learn?"
            className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-colors resize-none" />
        </div>
        <button onClick={join} disabled={loading || !name.trim() || !email.trim()}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-[13px] font-bold rounded-xl transition-colors">
          {loading ? 'Joining...' : 'Join waitlist →'}
        </button>
      </div>
    </div>
  )
}

const INPUT = 'w-full min-h-11 rounded-[10px] border border-gray-300 bg-white px-3 text-[15px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/30 transition-colors'
const LABEL = 'block text-[13px] font-semibold text-gray-700 mb-1.5'
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'

/** One of the next free times the page hands over (src/lib/profile-data.ts): the instant, and the same start on the tutor's own clock. */
export interface SoonestSlot { at: string; date: string; time: string }

function Step({ n, title, locked = false, children }: { n: number; title: string; locked?: boolean; children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-5 py-4 border-t border-gray-200">
      <p className={`flex items-center gap-2 text-[14px] font-semibold mb-3 ${locked ? 'text-gray-600' : 'text-gray-800'}`}>
        <span className={`h-[22px] w-[22px] rounded-full grid place-items-center text-[12px] font-bold ${locked ? 'bg-gray-100 text-gray-600 border border-gray-300' : 'bg-indigo-600 text-white'}`} aria-hidden="true">{n}</span>
        {title}
      </p>
      {children}
    </div>
  )
}

export function BookingForm({ highlightPlanId = null, tutor, availability, subscriptionPlans = [], contractTemplate = null, blockedDates = [], packages = [], trialEnabled = false, trialPrice = null, tutorSlug = '', prefillName = '', prefillEmail = '', teamMemberId = null, cardCheckoutEnabled = false, durations = [...ALL_DURATIONS], defaultDuration = FALLBACK_DEFAULT, soonest = [] }: { highlightPlanId?: string | null; durations?: number[]; defaultDuration?: number; cardCheckoutEnabled?: boolean; tutor: Tutor; availability: Availability[]; subscriptionPlans?: SubscriptionPlan[]; contractTemplate?: string | null; blockedDates?: string[]; packages?: LessonPackage[]; trialEnabled?: boolean; trialPrice?: number | null; tutorSlug?: string; prefillName?: string; prefillEmail?: string; teamMemberId?: string | null; soonest?: SoonestSlot[] }) {
  const today = new Date()
  const todayStr = toDS(today.getFullYear(), today.getMonth(), today.getDate())

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(defaultDuration)
  const [name, setName] = useState(prefillName)
  const [email, setEmail] = useState(prefillEmail)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [done, setDone] = useState(false)
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [booked, setBooked] = useState<BookedPrice>({ price: null, currency: 'USD' })
  // the address the confirmation comes from, so the line about the spam folder names the real one
  const [senderEmail, setSenderEmail] = useState(DEFAULT_FROM_ADDRESS)
  const [studentTz, setStudentTz] = useState<string>('')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [isTrial, setIsTrial] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState<{ code: string; type: string; value: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [waitlistJoined, setWaitlistJoined] = useState(false)

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setStudentTz(tz) // eslint-disable-line react-hooks/set-state-in-effect -- the student's time zone is only known in the browser, after mount
    } catch {
      setStudentTz('')
    }
  }, [])

  const tutorTz = tutor.timezone || 'UTC'
  const bufferMinutes = tutor.buffer_minutes ?? 0
  const availDaySet = new Set(availability.map(a => a.day_of_week))
  const blockedSet = new Set(blockedDates)
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const slots = getSlots(availability, date, duration, bufferMinutes)
  const contractOk = !contractTemplate || (termsAgreed && signatureName.trim())
  const detailsOk = name.trim() && email.trim()
  const canBook = date && time && detailsOk && contractOk
  const showTzConvert = studentTz && studentTz !== tutorTz
  const first = firstNameOf(tutor.name)
  const dateWords = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''
  // the soonest times were worked out for the length selected first; another length may not fit them
  const quick = duration === defaultDuration && !date ? soonest.slice(0, 3) : []
  const labelTz = safeZone(studentTz || tutorTz)

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true); setCouponError('')
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode, tutor_id: tutor.id }),
    })
    const d = await res.json()
    setCouponLoading(false)
    if (d.valid) {
      setCouponApplied({ code: couponCode.toUpperCase(), type: d.discount_type, value: d.discount_value })
      setCouponError('')
    } else {
      setCouponError(d.error ?? 'Invalid code')
      setCouponApplied(null)
    }
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); setDate(''); setTime('') }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); setDate(''); setTime('') }

  function pickDay(d: number) {
    const ds = toDS(year, month, d)
    if (ds < todayStr || blockedSet.has(ds)) return
    setDate(ds); setTime('')
  }

  function pickSoonest(s: SoonestSlot) {
    const [y, m] = s.date.split('-').map(Number)
    setYear(y); setMonth(m - 1); setDate(s.date); setTime(s.time)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canBook) return
    setLoading(true)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutorId: tutor.id, date, time, duration, name, email, message: note, termsAgreed,
        isTrial, couponCode: couponApplied?.code ?? null, teamMemberId,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      setPortalToken(d.portal_token ?? null)
      setLessonId(d.lesson_id ?? null)
      if (typeof d.sender_email === 'string' && d.sender_email.includes('@')) setSenderEmail(d.sender_email)
      setBooked({ price: typeof d.price === 'number' ? d.price : null, currency: d.currency ?? tutor.currency ?? 'USD' })
      setDone(true)
    } else {
      const e = await res.json(); toast.error(e.error ?? 'Booking failed')
    }
    setLoading(false)
  }

  const hasNoAvailability = availability.length === 0

  if (done) return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className={`${CARD_BOX} px-5 py-8 text-center`} role="status">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle className="h-8 w-8" aria-hidden="true" /></div>
        <h2 className="text-[22px] font-bold text-gray-900">You&apos;re booked</h2>
        <p className="mt-1.5 text-[15px] text-gray-700"><b className="text-gray-900">{dateWords} · {fmt12(time)}</b><br />{duration} min with {first}</p>
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-left text-[14px] text-emerald-900">
          Confirmation will be sent to <strong>{email}</strong>
          <p className="mt-1 font-normal">{spamHintFor(senderEmail)}</p>
        </div>
        {signatureName && (
          <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-gray-600">
            Signed by: <strong className="text-gray-800">{signatureName}</strong>
          </div>
        )}
        {portalToken && (
          <a href={`/portal/${portalToken}`} className={`mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-[15px] font-bold text-white hover:bg-indigo-700 ${FOCUS}`}>
            Access your student portal <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
      <PaymentPanel tutor={tutor} booked={booked} cardCheckoutEnabled={cardCheckoutEnabled} duration={duration} lessonId={lessonId} portalToken={portalToken} />
    </div>
  )

  if (hasNoAvailability) {
    if (waitlistJoined) return (
      <div className={`${CARD_BOX} mx-auto w-full max-w-[460px] px-5 py-10 text-center`} role="status">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-900"><CheckCircle className="h-8 w-8" aria-hidden="true" /></div>
        <h2 className="text-[20px] font-bold text-gray-900">You&apos;re on the list</h2>
        <p className="mt-2 text-[14px] text-gray-600">We&apos;ll tell you when new times open up.</p>
      </div>
    )
    return (
      <div className="mx-auto w-full max-w-[460px] space-y-4">
        <div className={`${CARD_BOX} px-5 py-8 text-center`}>
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-900"><Users className="h-6 w-6" aria-hidden="true" /></div>
          <h2 className="text-[18px] font-bold text-gray-900">No times open right now</h2>
          <p className="mt-2 text-[14px] text-gray-600">{first} has no free times at the moment. Leave your email and we will tell you the moment one opens.</p>
        </div>
        <WaitlistForm tutorId={tutor.id} onJoined={() => setWaitlistJoined(true)} tutorSlug={tutorSlug} prefillName={prefillName} prefillEmail={prefillEmail} />
      </div>
    )
  }

  const priceText = trialPrice && isTrial ? formatMoney(trialPrice, tutor.currency) : priceLabel(tutor.default_lesson_price, tutor.currency)
  const buttonText = loading ? 'Confirming...'
    : canBook ? `Book ${duration} min lesson`
    : !date || !time ? 'Choose a day and time'
    : !detailsOk ? 'Enter your name and email to book'
    : 'Agree to the lesson agreement to book'

  return (
    <div className="mx-auto w-full max-w-[460px] space-y-4">
    <form onSubmit={submit} className={`${CARD_BOX} overflow-hidden`} id="booking-form" aria-label={`Book a lesson with ${first}`}>
      <div className="flex items-baseline justify-between gap-3 px-4 sm:px-5 pt-5 pb-4">
        <h2 className="text-[20px] font-bold text-gray-900">Book a lesson</h2>
        {tutor.default_lesson_price ? (
          <p className="text-[13px] text-gray-600"><b className="text-[20px] text-gray-900">{priceLabel(tutor.default_lesson_price, tutor.currency)}</b> / lesson</p>
        ) : <p className="text-[13px] text-gray-600">Price: ask the tutor</p>}
      </div>

      {/* 1 — Lesson length, and the trial lesson */}
      <Step n={1} title="Lesson length">
        <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1" role="group" aria-label="Lesson length">
          {durations.map(v => (
            <button type="button" key={v} aria-pressed={duration === v}
              onClick={() => { setDuration(v); setTime('') }}
              className={`min-h-10 rounded-[9px] text-[14px] font-semibold transition-colors ${FOCUS} ${
                duration === v ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-600' : 'text-gray-700 hover:bg-white/60'
              }`}>
              {durationLabel(v)}
            </button>
          ))}
        </div>
        {trialEnabled && trialPrice && (
          <button type="button" role="switch" aria-checked={isTrial} onClick={() => setIsTrial(v => !v)}
            className={`mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 px-3 py-2.5 text-left ${FOCUS}`}>
            <Gift className="h-[18px] w-[18px] shrink-0 text-indigo-600" aria-hidden="true" />
            <span className="block min-w-0 flex-1 whitespace-normal text-[14px]">
              <b className="block text-gray-900">Trial lesson {priceLabel(trialPrice, tutor.currency)}</b>
              <span className="block text-[13px] leading-snug text-gray-600">Your first lesson, at an introductory price</span>
            </span>
            <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${isTrial ? 'bg-indigo-600' : 'bg-gray-400'}`} aria-hidden="true">
              <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${isTrial ? 'left-[19px]' : 'left-[3px]'}`} />
            </span>
          </button>
        )}
      </Step>

      {/* 2 — Day and time */}
      <Step n={2} title="Day and time">
        {quick.length > 0 && (
          <div className="mb-3.5" data-testid="soonest-times">
            <p className="mb-2 flex items-center gap-1.5 text-[13px] text-gray-600"><Zap className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" /> Soonest times</p>
            <div className="grid grid-cols-3 gap-2">
              {quick.map(s => {
                const ms = Date.parse(s.at)
                return (
                  <button type="button" key={s.at} onClick={() => pickSoonest(s)}
                    className={`min-h-11 rounded-[10px] border border-indigo-200 bg-white px-1.5 py-1 text-[14px] font-semibold leading-tight text-indigo-700 hover:bg-indigo-50 ${FOCUS}`}>
                    {dayLabel(ms, labelTz, today)}
                    <span className="block text-[12px] font-medium text-gray-600">{formatClock(ms, labelTz)}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 flex items-center gap-3 text-[12px] text-gray-600"><span className="h-px flex-1 bg-gray-200" />or pick a date<span className="h-px flex-1 bg-gray-200" /></p>
          </div>
        )}

        <div className="mb-1.5 flex items-center justify-between">
          <button type="button" onClick={prevMonth} aria-label="Previous month"
            className={`grid h-10 w-10 place-items-center rounded-[10px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${FOCUS}`}>
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <p className="text-[15px] font-bold text-gray-900" aria-live="polite">{MONTHS[month]} {year}</p>
          <button type="button" onClick={nextMonth} aria-label="Next month"
            className={`grid h-10 w-10 place-items-center rounded-[10px] border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${FOCUS}`}>
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center">
          {DAYS_SHORT.map(d => <p key={d} className="py-1 text-[12px] font-semibold text-gray-600" aria-hidden="true">{d.slice(0, 1)}</p>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
            const ds = toDS(year, month, d)
            const isPast = ds < todayStr
            const isBlocked = blockedSet.has(ds)
            const isToday = ds === todayStr
            const isSel = ds === date
            const hasAvail = availDaySet.size === 0 || availDaySet.has(new Date(ds + 'T00:00:00').getDay())
            const words = new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            return (
              <button type="button" key={d} disabled={isPast || isBlocked} onClick={() => pickDay(d)}
                aria-label={`${words}${isBlocked ? ', not available' : ''}`} aria-pressed={isSel}
                title={isBlocked ? 'Not available' : undefined}
                className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${FOCUS}
                  ${isSel ? 'bg-indigo-600 text-white' :
                    isPast ? 'text-gray-200 cursor-default' :
                    isBlocked ? 'text-red-300 line-through cursor-not-allowed bg-red-50' :
                    hasAvail ? 'bg-indigo-50 text-indigo-700 hover:ring-2 hover:ring-indigo-300' :
                    'text-gray-600 hover:bg-gray-100'}
                  ${isToday && !isSel ? 'ring-1 ring-gray-500' : ''}`}>
                {d}
              </button>
            )
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-600">
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border border-indigo-300 bg-indigo-50 align-[-1px]" aria-hidden="true" />Times available</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full border border-gray-300 align-[-1px]" aria-hidden="true" />Not available</span>
        </p>

        {date && (
          slots.length === 0 ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-[10px] bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900" role="status">
              <CalendarX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span><b>No times on this day.</b> Pick another day{soonest[0] && duration === defaultDuration ? ' or use one of the soonest times above' : ''}.</span>
            </div>
          ) : (
            <>
              <div className="mb-2 mt-4 flex items-baseline justify-between text-[14px]">
                <b className="text-[15px] text-gray-900">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</b>
                <span className="text-gray-600">{duration} min</span>
              </div>
              <div className="grid max-h-[280px] grid-cols-3 gap-2 overflow-y-auto" role="group" aria-label="Times">
                {slots.map(s => {
                  const studentTime = showTzConvert ? convertSlot(date, s, tutorTz, studentTz) : null
                  return (
                    <button type="button" key={s} aria-pressed={time === s} onClick={() => setTime(t => t === s ? '' : s)}
                      className={`min-h-11 rounded-[10px] border px-1 py-1 text-[14px] font-semibold leading-tight transition-colors ${FOCUS} ${
                        time === s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
                      }`}>
                      {fmt12(s)}
                      {studentTime && studentTime !== s && (
                        <span className={`block text-[12px] font-medium ${time === s ? 'text-indigo-100' : 'text-gray-600'}`}>{fmt12(studentTime)} yours</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-gray-600">
          <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {showTzConvert ? <span>Times are in {first}&apos;s time zone: {tutorTz}. Your time zone: {studentTz}.</span> : <span>Time zone: {tutorTz}</span>}
        </p>
      </Step>

      {/* 3 — Your details */}
      {date && time ? (
        <Step n={3} title="Your details">
          {!prefillEmail && (
            <>
              <GoogleContinueButton slug={tutorSlug} label="Continue with Google" />
              <p className="my-3 flex items-center gap-3 text-[12px] text-gray-600"><span className="h-px flex-1 bg-gray-200" />or enter your details<span className="h-px flex-1 bg-gray-200" /></p>
            </>
          )}
          {prefillEmail && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900">
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> Signed in as {prefillEmail}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="bk-name" className={LABEL}>Full name</label>
              <input id="bk-name" required value={name} onChange={e => setName(e.target.value)} placeholder="Alex Student" autoComplete="name" className={INPUT} />
            </div>
            <div>
              <label htmlFor="bk-email" className={LABEL}>Email</label>
              <input id="bk-email" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={INPUT} />
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="bk-note" className={LABEL}>Message <span className="font-normal text-gray-600">(optional)</span></label>
            <textarea id="bk-note" value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="What do you want to work on?" className={`${INPUT} resize-none py-2.5`} />
          </div>

          {/* Promo code: one quiet link until the student wants it */}
          <div className="mt-3">
            {couponApplied ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900">
                  <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="font-mono font-bold">{couponApplied.code}</span>
                  <span>— {couponApplied.type === 'percent' ? `${couponApplied.value}%` : formatMoney(couponApplied.value, tutor.currency)} off</span>
                </div>
                <button type="button" onClick={() => { setCouponApplied(null); setCouponCode('') }}
                  className={`min-h-11 px-2 text-[13px] font-semibold text-gray-700 underline ${FOCUS}`}>Remove</button>
              </div>
            ) : couponOpen ? (
              <div>
                <label htmlFor="bk-promo" className={LABEL}><Tag className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Promo code</label>
                <div className="flex gap-2">
                  <input id="bk-promo" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                    placeholder="Enter code" maxLength={20} className={`${INPUT} flex-1 font-mono uppercase`} />
                  <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                    className={`min-h-11 rounded-xl bg-indigo-600 px-4 text-[14px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 ${FOCUS}`}>
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-red-700" role="alert"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{couponError}</p>}
              </div>
            ) : (
              <button type="button" onClick={() => setCouponOpen(true)} className={`min-h-11 text-[14px] font-semibold text-indigo-700 underline ${FOCUS}`}>Have a promo code?</button>
            )}
          </div>

          {/* The lesson agreement, when the tutor has one */}
          {contractTemplate && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
              <p className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-gray-900"><FileText className="h-4 w-4 text-amber-800" aria-hidden="true" /> Lesson agreement</p>
              <div className="max-h-36 overflow-y-auto rounded-lg bg-white px-3 py-2.5">
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-gray-700">{contractTemplate}</pre>
              </div>
              <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3">
                <input type="checkbox" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-indigo-600" />
                <span className="text-[14px] leading-snug text-gray-800">I have read and agree to the terms above</span>
              </label>
              <label htmlFor="bk-sign" className={`${LABEL} mt-2`}>Type your full name to sign</label>
              <input id="bk-sign" value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Your full name as signature" className={INPUT} />
            </div>
          )}
        </Step>
      ) : (
        <Step n={3} title="Your details" locked>
          <p className="text-[14px] text-gray-600">Choose a time first. Then you only need your name and email.</p>
        </Step>
      )}

      {/* What was chosen, then the button */}
      {date && time && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-3 sm:mx-5" data-testid="booking-summary">
          <CalendarClock className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
          <div className="text-[13px] text-gray-700">
            <b className="block text-[15px] text-gray-900">{dateWords} · {fmt12(time)}{showTzConvert ? <span className="font-normal text-gray-600"> (tutor&apos;s time)</span> : null}</b>
            {duration} min with {first}
            {couponApplied ? ` · promo ${couponApplied.code} applied` : priceText ? ` · ${isTrial ? 'trial ' : ''}${priceText}` : ''}
          </div>
        </div>
      )}
      <div className="border-t border-gray-200 px-4 pb-5 pt-4 sm:px-5">
        <button type="submit" disabled={!canBook || loading || subscribing}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[16px] font-bold transition-colors ${FOCUS} ${
            canBook && !loading ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-600'
          }`}>
          {canBook && !loading && <CalendarCheck className="h-5 w-5" aria-hidden="true" />}{buttonText}
        </button>
        <p className="mt-2.5 text-center text-[12px] text-gray-600">
          {tutor.cancellation_hours > 0 ? `Free cancellation up to ${tutor.cancellation_hours}h before the lesson. ` : 'No free cancellation for this tutor. '}You pay the tutor directly.
        </p>
      </div>
    </form>

    {/* Lesson Packages (the embed and team pages; /book/<slug> draws them in the page itself) */}
    {packages.length > 0 && (
      <PackagePanel packages={packages} tutor={tutor} name={name} email={email} />
    )}

    {/* Subscription Plans */}
    {subscriptionPlans.length > 0 && (
      <SubscriptionPanel
        plans={subscriptionPlans}
        highlightId={highlightPlanId}
        tutor={tutor}
        name={name}
        email={email}
        onSubscribing={setSubscribing}
      />
    )}
    </div>
  )
}
