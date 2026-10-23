'use client'

// Settings, section "Booking page" (T-0844): one tab of the Settings page, loaded the first time it is opened. All the values live in the
// page (src/app/(dashboard)/settings/page.tsx) and arrive here as `ctx`, so switching sections never loses what is being typed.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Globe, Link, Clock, ExternalLink, Code, Copy, Check, X } from 'lucide-react'
import { CustomDomainCard } from '@/app/(dashboard)/settings/CustomDomainCard'
import { hasPlan } from '@/lib/plans'
import { ALL_DURATIONS, MAX_DURATIONS, MIN_DURATION, MAX_DURATION, DURATION_STEP, toggleDuration, addCustomDuration, chooseDefault } from '@/lib/lesson-durations'
import { BUFFER_OPTIONS, TIMEZONES } from '@/components/settings/sections/options'
import { SectionHead } from '@/components/settings/sections/SectionHead'
import type { SettingsCtx } from '@/components/settings/sections/context'

export default function BookingSection({ ctx }: { ctx: SettingsCtx }) {
  const { form, setForm, slug, linkCopied, setLinkCopied, customLength, setCustomLength, customLengthError, setCustomLengthError, subscriptionStatus } = ctx
  return (
    <>
      <SectionHead title="Booking page" text="Your time zone, lesson lengths, price, cancellation rules and booking link." />
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
    </>
  )
}
