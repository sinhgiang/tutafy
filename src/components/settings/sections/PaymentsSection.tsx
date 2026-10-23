'use client'

// Settings, section "Payments" (T-0844): one tab of the Settings page, loaded the first time it is opened. All the values live in the
// page (src/app/(dashboard)/settings/page.tsx) and arrive here as `ctx`, so switching sections never loses what is being typed.
import { CheckCircle, Wallet } from 'lucide-react'
import { LockedFeature } from '@/components/plan/LockedFeature'
import { CARD_LINK_HELP_LINKS } from '@/lib/card-link-help'
import { SectionHead } from '@/components/settings/sections/SectionHead'
import type { SettingsCtx } from '@/components/settings/sections/context'

export default function PaymentsSection({ ctx }: { ctx: SettingsCtx }) {
  const { form, setForm, userId, userEmail, cardLinkError, setCardLinkError, stripeConnected, stripeEnabled, connectingStripe, connectStripe, subscriptionStatus, isPaid, savedCardLinkUnusable } = ctx
  return (
    <>
      <SectionHead title="Payments" text="How students pay you for lessons." />
  {!isPaid ? (
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
  )}
    </>
  )
}
