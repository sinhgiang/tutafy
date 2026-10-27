'use client'

// Settings, section "Trial lesson and contract" (T-0844): one tab of the Settings page, loaded the first time it is opened. All the values live in the
// page (src/app/(dashboard)/settings/page.tsx) and arrive here as `ctx`, so switching sections never loses what is being typed.
import { FileText, Star } from 'lucide-react'
import { SectionHead } from '@/components/settings/sections/SectionHead'
import type { SettingsCtx } from '@/components/settings/sections/context'
import { TRIAL_NAME, TRIAL_RULE } from '@/lib/trial'

export default function ExtrasSection({ ctx }: { ctx: SettingsCtx }) {
  const { form, setForm } = ctx
  return (
    <>
      <SectionHead title="Trial lesson and contract" text="An optional first lesson at an introductory price, and the terms students agree to." />
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
                <p className="text-[11px] text-gray-400 mt-0.5">Show a {TRIAL_NAME} option for first-time students on your booking page</p>
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
                <label htmlFor="settings-trial-price" className="block text-[12px] font-medium text-gray-600 mb-1.5">Trial lesson price (USD)</label>
                <input id="settings-trial-price" type="number" min="0" step="0.01" placeholder="e.g. 10.00" value={form.trial_price}
                  onChange={e => setForm(f => ({ ...f, trial_price: e.target.value }))}
                  className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
                <p className="text-[11px] text-gray-400 mt-1" data-testid="trial-rule">{TRIAL_RULE} You set the price: lower than your regular price encourages first bookings.</p>
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
              aria-label="Contract text"
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
    </>
  )
}
