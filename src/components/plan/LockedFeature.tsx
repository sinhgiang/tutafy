'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Sparkles, Users, Check, ArrowRight, Loader2, Zap } from 'lucide-react'
import { polarCheckoutUrl, PLAN_LABEL, PLAN_PRICE, type Plan } from '@/lib/plans'
import { trackCheckoutClick } from '@/lib/track-client'

const BENEFITS: Record<Plan, string[]> = {
  free: [],
  pro: [
    'Unlimited students',
    '7 AI teaching tools',
    'Payment links & online payments',
    'Full reports & analytics',
  ],
  academy: [
    'Everything in Pro',
    'Up to 5 tutors on your team',
    'Automatic payroll & pay runs',
    'Priority support',
  ],
}

export function LockedFeature({
  required,
  plan,
  feature,
  email,
  tutorId,
  canInstantUpgrade = false,
}: {
  required: Plan
  plan: Plan
  feature: string
  email: string
  tutorId: string
  canInstantUpgrade?: boolean
}) {
  const router = useRouter()
  const isAcademy = required === 'academy'
  const Icon = isAcademy ? Users : Sparkles
  const checkoutHref = polarCheckoutUrl(required, email, tutorId)
  const [charging, setCharging] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // One-click, no-checkout upgrade: charge the saved card via Polar's API and
  // unlock the page in place. Falls back to the hosted checkout if the tutor has
  // no card on file yet (first paid upgrade) or the API isn't configured.
  async function instantUpgrade() {
    if (required !== 'free') trackCheckoutClick(required) // visitor journey: only if cookies were accepted
    setCharging(true)
    try {
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: required }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        toast.success(`You're on ${PLAN_LABEL[required]} now — enjoy!`)
        router.refresh()
        return
      }
      if (data.needsCheckout || res.status === 503 || res.status === 409) {
        window.location.href = checkoutHref // no saved card → collect one via checkout
        return
      }
      if (res.status === 402) {
        toast.error('Your card was declined. Please update your payment method.')
        window.location.href = checkoutHref
        return
      }
      toast.error('Could not complete the upgrade. Opening checkout…')
      window.location.href = checkoutHref
    } catch {
      window.location.href = checkoutHref
    } finally {
      setCharging(false)
    }
  }

  return (
    <div>
      {/* T-0825: a plan feature is shown as a quiet "Pro" tag and an upgrade sheet, not a blurred page with a padlock. */}
      <div className="dash-head">
        <div>
          <h1>{feature} <span className="dash-chip is-brand-chip" data-testid="plan-tag" style={{ verticalAlign: 'middle', marginLeft: 6 }}>{PLAN_LABEL[required]}</span></h1>
          <p>This is part of the {PLAN_LABEL[required]} plan. You are on {PLAN_LABEL[plan]}.</p>
        </div>
      </div>
      <section className="dash-card dash-upgrade" aria-label={`Upgrade to ${PLAN_LABEL[required]}`} data-testid="upgrade-sheet">
        <div className="dash-upgrade-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span className="dash-state-ico is-brand" style={{ margin: 0, width: 40, height: 40 }}><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <b style={{ color: 'var(--d-ink)', fontSize: 16 }}>What you get with {PLAN_LABEL[required]}</b>
          </div>
          <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'grid', gap: 8 }}>
            {BENEFITS[required].map(b => (
              <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--d-ink-2)' }}>
                <Check className="h-4 w-4" aria-hidden="true" style={{ color: 'var(--d-ok)', flexShrink: 0 }} />{b}
              </li>
            ))}
          </ul>

          {canInstantUpgrade ? (
            // Card already on file → ask for confirmation, then charge instantly
            // (no checkout page).
            <button type="button" onClick={() => setConfirming(true)} className="dash-btn is-primary" style={{ width: '100%', height: 44 }}>
              <Zap className="h-4 w-4" fill="currentColor" aria-hidden="true" /> Upgrade to {PLAN_LABEL[required]} — {PLAN_PRICE[required]}
            </button>
          ) : (
            // No card yet (first paid upgrade) → prefilled hosted checkout.
            <a
              href={checkoutHref}
              onClick={() => { if (required !== 'free') trackCheckoutClick(required) }}
              className="dash-btn is-primary" style={{ width: '100%', height: 44 }}
            >
              Upgrade to {PLAN_LABEL[required]} — {PLAN_PRICE[required]}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          )}

          <Link href="/upgrade" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: 'var(--d-brand)' }}>
            Compare all plans
          </Link>

          <p style={{ margin: '16px 0 0', textAlign: 'center', color: 'var(--d-ink-3)', fontSize: 13 }}>
            {canInstantUpgrade
              ? 'One click charges your saved card and unlocks instantly · Cancel anytime'
              : 'Instant access after payment · Cancel anytime · We never take a cut of your income'}
          </p>
        </div>
      </section>

      {/* Confirmation dialog before charging the saved card */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px]"
            onClick={() => !charging && setConfirming(false)}
          />
          <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className={`px-7 pt-7 pb-5 text-center ${isAcademy ? 'bg-amber-500' : 'bg-indigo-500'}`}>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-white" fill="currentColor" />
              </div>
              <h3 className="text-[18px] font-bold text-white">Upgrade to {PLAN_LABEL[required]} now?</h3>
            </div>
            <div className="p-7">
              <p className="text-[13.5px] text-gray-600 leading-relaxed text-center">
                This is the <strong className="text-gray-900">{PLAN_LABEL[required]}</strong> plan
                ({PLAN_PRICE[required]}). If you continue, we&apos;ll charge the prorated difference for the
                rest of your billing period to your card on file <strong className="text-gray-900">right now</strong>,
                and unlock {PLAN_LABEL[required]} immediately — no checkout needed.
              </p>

              <button
                onClick={instantUpgrade}
                disabled={charging}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-bold text-white transition-colors disabled:opacity-70 mt-6 ${
                  isAcademy ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'
                }`}
              >
                {charging ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Charging your card…</>
                ) : (
                  <>Yes, upgrade &amp; pay now</>
                )}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={charging}
                className="w-full py-2.5 mt-2 rounded-xl text-[13px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                No, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
