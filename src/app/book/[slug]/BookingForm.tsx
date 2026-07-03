'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { CheckCircle, ChevronLeft, ChevronRight, Globe, ExternalLink, RefreshCw, FileText, Package, Tag, Star, Users } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DURATIONS = [{ v: 30, l: '30 min' }, { v: 45, l: '45 min' }, { v: 60, l: '60 min' }, { v: 90, l: '90 min' }]

interface Availability { day_of_week: number; start_time: string; end_time: string }
interface Tutor {
  id: string; name: string; timezone: string; cancellation_hours: number; buffer_minutes?: number
  paypal_link?: string; paddle_checkout_link?: string; stripe_account_id?: string
  default_lesson_price?: number
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

function getSlots(avail: Availability[], dateStr: string, duration: number, bufferMinutes = 0): string[] {
  if (!dateStr) return []
  const day = new Date(dateStr + 'T00:00:00').getDay()
  const slots: string[] = []
  for (const a of avail.filter(a => a.day_of_week === day)) {
    const [sh, sm] = a.start_time.split(':').map(Number)
    const [eh, em] = a.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const step = duration + bufferMinutes
    while (cur + duration <= eh * 60 + em) {
      const h = Math.floor(cur / 60), m = (cur % 60).toString().padStart(2, '0')
      slots.push(`${h.toString().padStart(2,'0')}:${m}`)
      cur += step
    }
  }
  return slots
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Payment methods panel shown after booking is confirmed
function PaymentPanel({ tutor, duration, lessonId, portalToken, studentName }: {
  tutor: Tutor; duration: number; lessonId?: string | null; portalToken?: string | null; studentName?: string
}) {
  const [payingCard, setPayingCard] = useState(false)
  const price = tutor.default_lesson_price
  const methods: { label: string; hint: string; color: string; link: string }[] = []

  if (tutor.paypal_link) {
    const isLink = tutor.paypal_link.startsWith('http')
    const link = isLink ? tutor.paypal_link : `https://www.paypal.com/paypalme/${tutor.paypal_link.replace('@', '')}`
    methods.push({ label: 'Pay via PayPal', hint: 'Instant payment', color: 'bg-[#0070BA] hover:bg-[#005ea6] text-white', link })
  }

  if (tutor.paddle_checkout_link) {
    methods.push({ label: 'Pay via Paddle', hint: 'Credit card / local methods', color: 'bg-emerald-600 hover:bg-emerald-700 text-white', link: tutor.paddle_checkout_link })
  }

  const showStripeCard = !!(lessonId && price && price > 0)

  if (methods.length === 0 && !showStripeCard) return null

  return (
    <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <p className="text-[13px] font-semibold text-gray-900">Pay for your lesson</p>
        {price && (
          <p className="text-[12px] text-gray-400 mt-0.5">
            ${price.toFixed(2)} · {duration} min session
          </p>
        )}
      </div>
      <div className="p-4 space-y-2.5">
        {methods.map(m => (
          <a key={m.label} href={m.link} target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-[13px] font-semibold transition-colors ${m.color}`}>
            <span>{m.label}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-normal opacity-80">
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
                  body: JSON.stringify({
                    lessonId,
                    portalToken,
                    amount: price,
                    tutorName: tutor.name,
                    studentName,
                    duration,
                    origin: window.location.origin,
                  }),
                })
                const data = await res.json()
                if (data.url) {
                  window.location.href = data.url
                } else {
                  toast.error(data.error ?? 'Card payment unavailable')
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
        <p className="text-[11px] text-gray-400 text-center pt-1">
          You will pay directly to the tutor. Tutafy does not process this payment.
        </p>
      </div>
    </div>
  )
}

interface SubscriptionPlan { id: string; name: string; description: string | null; price: number; currency: string; lessons_per_period: number; period: string; duration_minutes: number }
interface LessonPackage { id: string; name: string; description: string | null; lessons_count: number; price: number }

function PackagePanel({ packages, tutor, name, email }: { packages: LessonPackage[]; tutor: Tutor; name: string; email: string }) {
  function buyUrl(pkg: LessonPackage): string {
    if (tutor.paypal_link) {
      const base = tutor.paypal_link.startsWith('http')
        ? tutor.paypal_link
        : `https://www.paypal.com/paypalme/${tutor.paypal_link.replace('@', '')}`
      return `${base}/${pkg.price.toFixed(2)}`
    }
    if (tutor.paddle_checkout_link) return tutor.paddle_checkout_link
    return '#'
  }

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-emerald-50 flex items-center gap-2">
        <Package className="h-4 w-4 text-emerald-500" />
        <p className="text-[13px] font-semibold text-gray-900">Lesson packages</p>
        <span className="text-[11px] text-gray-400 ml-1">— save by buying in bulk</span>
      </div>
      <div className="p-4 space-y-3">
        {packages.map(pkg => {
          const perLesson = (pkg.price / pkg.lessons_count).toFixed(2)
          const url = buyUrl(pkg)
          return (
            <div key={pkg.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900">{pkg.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{pkg.lessons_count} lessons · ${perLesson}/lesson</p>
                {pkg.description && <p className="text-[11px] text-gray-500 mt-0.5">{pkg.description}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[15px] font-black text-gray-900">${pkg.price}</p>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  onClick={() => { if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return } }}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors">
                  Buy <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )
        })}
        <p className="text-[11px] text-gray-400 text-center">One-time payment · Paid directly to tutor</p>
      </div>
    </div>
  )
}

function SubscriptionPanel({ plans, tutor, name, email, onSubscribing }: { plans: SubscriptionPlan[]; tutor: Tutor; name: string; email: string; onSubscribing: (v: boolean) => void }) {
  const [loading, setLoading] = useState<string | null>(null)

  async function subscribe(plan: SubscriptionPlan) {
    if (!name.trim() || !email.trim()) { toast.error('Enter your name and email first'); return }
    setLoading(plan.id)
    onSubscribing(true)
    const res = await fetch('/api/subscriptions/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id, student_name: name, student_email: email, tutor_slug: (tutor as any).slug }),
    })
    const d = await res.json()
    onSubscribing(false)
    setLoading(null)
    if (d.url) window.location.href = d.url
    else toast.error(d.error ?? 'Failed to start checkout')
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-indigo-50 flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-indigo-400" />
        <p className="text-[13px] font-semibold text-gray-900">Subscribe for recurring lessons</p>
      </div>
      <div className="p-4 space-y-3">
        {plans.map(plan => (
          <div key={plan.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-gray-900">{plan.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {plan.lessons_per_period} lessons/{plan.period} · {plan.duration_minutes} min each
              </p>
              {plan.description && <p className="text-[11px] text-gray-500 mt-0.5">{plan.description}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[15px] font-black text-gray-900">${plan.price}<span className="text-[11px] font-normal text-gray-400">/{plan.period}</span></p>
              <button onClick={() => subscribe(plan)} disabled={loading === plan.id}
                className="mt-1 text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors">
                {loading === plan.id ? 'Loading...' : 'Subscribe'}
              </button>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-gray-400 text-center">Recurring payment · Cancel anytime</p>
      </div>
    </div>
  )
}

function WaitlistForm({ tutorId, onJoined }: { tutorId: string; onJoined: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
    else toast.error('Failed to join waitlist')
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-50 flex items-center gap-2">
        <Users className="h-4 w-4 text-amber-500" />
        <p className="text-[13px] font-semibold text-gray-900">Join the waitlist</p>
        <span className="text-[11px] text-gray-400 ml-1">— we&apos;ll notify you when slots open</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1.5">Full name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith"
              className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1.5">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com"
              className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-colors" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1.5">Message <span className="text-gray-400 font-normal">(optional)</span></label>
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

export function BookingForm({ tutor, availability, subscriptionPlans = [], contractTemplate = null, blockedDates = [], packages = [], trialEnabled = false, trialPrice = null, tutorSlug = '' }: { tutor: Tutor; availability: Availability[]; subscriptionPlans?: SubscriptionPlan[]; contractTemplate?: string | null; blockedDates?: string[]; packages?: LessonPackage[]; trialEnabled?: boolean; trialPrice?: number | null; tutorSlug?: string }) {
  const today = new Date()
  const todayStr = toDS(today.getFullYear(), today.getMonth(), today.getDate())

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [done, setDone] = useState(false)
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [studentTz, setStudentTz] = useState<string>('')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [isTrial, setIsTrial] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState<{ code: string; type: string; value: number } | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [waitlistJoined, setWaitlistJoined] = useState(false)

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      setStudentTz(tz)
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
  const canBook = date && time && name.trim() && email.trim() && (!contractTemplate || termsAgreed)
  const showTzConvert = studentTz && studentTz !== tutorTz

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

  function calcDiscount(basePrice: number): number {
    if (!couponApplied) return 0
    if (couponApplied.type === 'percent') return Math.min(basePrice, (basePrice * couponApplied.value) / 100)
    return Math.min(basePrice, couponApplied.value)
  }

  function prevMonth() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1); setDate(''); setTime('') }
  function nextMonth() { month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1); setDate(''); setTime('') }

  function pickDay(d: number) {
    const ds = toDS(year, month, d)
    if (ds < todayStr || blockedSet.has(ds)) return
    setDate(ds); setTime('')
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
        isTrial, couponCode: couponApplied?.code ?? null,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      setPortalToken(d.portal_token ?? null)
      setLessonId(d.lesson_id ?? null)
      setDone(true)
    } else {
      const e = await res.json(); toast.error(e.error ?? 'Booking failed')
    }
    setLoading(false)
  }

  const hasNoAvailability = availability.length === 0

  if (done) return (
    <div>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h2 className="text-[24px] font-bold text-gray-900">You&apos;re booked!</h2>
        <p className="text-[14px] text-gray-500 mt-2">
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {fmt12(time)} · {duration} min
        </p>
        <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl px-6 py-3 text-[13px] text-emerald-700">
          Confirmation will be sent to <strong>{email}</strong>
        </div>
        {portalToken && (
          <a
            href={`/portal/${portalToken}`}
            className="mt-5 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[14px] font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Access your student portal →
          </a>
        )}
      </div>
      <PaymentPanel tutor={tutor} duration={duration} lessonId={lessonId} portalToken={portalToken} studentName={name} />
    </div>
  )

  if (hasNoAvailability) {
    if (waitlistJoined) return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-[20px] font-bold text-gray-900">You&apos;re on the list!</h2>
        <p className="text-[13px] text-gray-500 mt-2">We&apos;ll notify you when new slots open up.</p>
      </div>
    )
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-amber-500" />
          </div>
          <h2 className="text-[18px] font-bold text-gray-900">No availability right now</h2>
          <p className="text-[13px] text-gray-500 mt-2">This tutor doesn&apos;t have open slots at the moment. Join the waitlist and be the first to know.</p>
        </div>
        <WaitlistForm tutorId={tutor.id} onJoined={() => setWaitlistJoined(true)} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
    <form onSubmit={submit} className="space-y-5">

      {/* Trial lesson option */}
      {trialEnabled && trialPrice && (
        <div className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
          isTrial ? 'border-emerald-400 bg-emerald-50/60' : 'border-gray-100 bg-white hover:border-emerald-200'
        }`} onClick={() => setIsTrial(v => !v)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTrial ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                <Star className={`h-4 w-4 ${isTrial ? 'text-white' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-900">Trial lesson — ${Number(trialPrice).toFixed(0)}</p>
                <p className="text-[11px] text-gray-500">Your first session at a special introductory price</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              isTrial ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
            }`}>
              {isTrial && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </div>
        </div>
      )}

      {/* Timezone notice */}
      {showTzConvert && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <Globe className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          <p className="text-[12px] text-blue-700">
            Tutor timezone: <strong>{tutorTz}</strong> · Times shown in tutor&apos;s timezone
            {studentTz && <span className="text-blue-500"> (yours: {studentTz})</span>}
          </p>
        </div>
      )}

      {/* 1 — Duration */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Session length</p>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map(d => (
            <button type="button" key={d.v}
              onClick={() => { setDuration(d.v); setTime('') }}
              className={`text-[13px] px-5 py-2 rounded-xl font-semibold transition-all ${
                duration === d.v ? 'bg-indigo-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {d.l}
            </button>
          ))}
        </div>
      </div>

      {/* 2 — Calendar + Time */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] divide-y sm:divide-y-0 sm:divide-x divide-gray-50">

          {/* Calendar */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <p className="text-[14px] font-bold text-gray-900">{MONTHS[month]} {year}</p>
              <button type="button" onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAYS_SHORT.map(d => <p key={d} className="text-center text-[11px] font-bold text-gray-300 py-1">{d}</p>)}
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
                return (
                  <button type="button" key={d} disabled={isPast || isBlocked} onClick={() => pickDay(d)}
                    title={isBlocked ? 'Not available' : undefined}
                    className={`mx-auto w-9 h-9 rounded-full text-[13px] font-medium transition-all flex items-center justify-center
                      ${isSel ? 'bg-indigo-500 text-white shadow-sm' :
                        isPast ? 'text-gray-200 cursor-default' :
                        isBlocked ? 'text-red-300 line-through cursor-not-allowed bg-red-50' :
                        isToday ? 'ring-2 ring-indigo-400 text-indigo-600 font-bold hover:bg-indigo-50' :
                        hasAvail ? 'text-gray-800 hover:bg-indigo-50 hover:text-indigo-600' :
                        'text-gray-400 hover:bg-gray-50'}`}>
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="p-5">
            {!date ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <p className="text-[12px] text-gray-300 font-medium">← Pick a date</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-1">
                <p className="text-[13px] font-semibold text-gray-400">No availability</p>
                <p className="text-[11px] text-gray-300">Try another date</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {slots.map(s => {
                    const studentTime = showTzConvert ? convertSlot(date, s, tutorTz, studentTz) : null
                    return (
                      <button type="button" key={s} onClick={() => setTime(t => t === s ? '' : s)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
                          time === s
                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                            : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}>
                        <span className="text-[13px] font-semibold">{fmt12(s)}</span>
                        {studentTime && studentTime !== s && (
                          <span className={`block text-[10px] mt-0.5 ${time === s ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {fmt12(studentTime)} your time
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Selected summary strip */}
        {date && time && (
          <div className="border-t border-indigo-50 bg-indigo-50/60 px-5 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
            <p className="text-[13px] text-indigo-800 font-medium">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}{fmt12(time)} · {duration} min
              {showTzConvert && (
                <span className="text-indigo-500 font-normal"> (tutor&apos;s time)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* 3 — Your details */}
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
        date && time ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-40 pointer-events-none'
      }`}>
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Your details</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Full name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="John Smith"
                className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Email address *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com"
                className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Message <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="What would you like to focus on in this lesson?"
              className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none" />
          </div>
        </div>
      </div>

      {/* 4 — Coupon code */}
      {date && time && name.trim() && email.trim() && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-gray-400" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Promo code</p>
          </div>
          {couponApplied ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-[13px] font-bold text-emerald-700 font-mono">{couponApplied.code}</span>
                <span className="text-[12px] text-emerald-600">
                  — {couponApplied.type === 'percent' ? `${couponApplied.value}%` : `$${couponApplied.value}`} off
                </span>
              </div>
              <button type="button" onClick={() => { setCouponApplied(null); setCouponCode('') }}
                className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                placeholder="Enter code" maxLength={20}
                className="flex-1 text-[13px] font-mono px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors uppercase" />
              <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                className="text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 px-4 rounded-xl transition-colors">
                {couponLoading ? '...' : 'Apply'}
              </button>
            </div>
          )}
          {couponError && <p className="text-[11px] text-red-500 mt-2">{couponError}</p>}
        </div>
      )}

      {/* 5 — Contract (if tutor has one) */}
      {contractTemplate && (
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
          date && time && name.trim() && email.trim() ? 'border-amber-100 opacity-100' : 'border-gray-100 opacity-40 pointer-events-none'
        }`}>
          <div className="px-5 py-4 border-b border-amber-50 flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-500" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Lesson agreement</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3 max-h-36 overflow-y-auto">
              <pre className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">{contractTemplate}</pre>
            </div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={e => setTermsAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  termsAgreed ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 group-hover:border-indigo-400'
                }`}>
                  {termsAgreed && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                </div>
              </div>
              <span className="text-[13px] text-gray-700 leading-snug">
                I have read and agree to the terms above
              </span>
            </label>
          </div>
        </div>
      )}

      {/* 6 — Submit */}
      <button type="submit" disabled={!canBook || loading || subscribing}
        className={`w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all shadow-sm ${
          canBook && !loading
            ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}>
        {loading ? 'Confirming...' : canBook ? `Book ${duration} min lesson →` : 'Select date, time and fill your details'}
      </button>

      {canBook && (
        <p className="text-center text-[11px] text-gray-400">
          By booking you agree to the {tutor.cancellation_hours}h cancellation policy.
        </p>
      )}
    </form>

    {/* Lesson Packages */}
    {packages.length > 0 && (
      <PackagePanel packages={packages} tutor={tutor} name={name} email={email} />
    )}

    {/* Subscription Plans */}
    {subscriptionPlans.length > 0 && (
      <SubscriptionPanel
        plans={subscriptionPlans}
        tutor={tutor}
        name={name}
        email={email}
        onSubscribing={setSubscribing}
      />
    )}
    </div>
  )
}
