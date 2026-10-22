'use client'

// The introduction (bio) box in Settings, Profile tab, with starting templates (T-0765). It is the same text box as before: a template
// only fills it, and the tutor saves it like any other bio. Nothing about a template is stored.
import { useId, useState } from 'react'
import { Lightbulb, AlertCircle } from 'lucide-react'
import { INTRO_TEMPLATES, unfilledParts, type IntroTemplate } from '@/lib/intro-templates'
import { BIO_MIN_CHARS } from '@/lib/profile-completion'

export function IntroEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const id = useId()
  // a template waiting for the tutor to confirm replacing what they already wrote
  const [pending, setPending] = useState<IntroTemplate | null>(null)
  const left = unfilledParts(value)
  const length = value.trim().length

  function choose(t: IntroTemplate) {
    if (value.trim() === '' || INTRO_TEMPLATES.some(x => x.text === value.trim())) {
      setPending(null)
      onChange(t.text)
    } else {
      setPending(t)
    }
  }

  return (
    <div>
      <label htmlFor={`${id}-bio`} className="block text-[12px] font-medium text-gray-600 mb-1.5">
        Introduction <span className="text-gray-500 font-normal">(shown on your public profile and booking page)</span>
      </label>

      <p className="text-[12px] text-gray-500 mb-2" id={`${id}-tpl`}>Start from a template, then replace the parts in [square brackets].</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3" role="group" aria-labelledby={`${id}-tpl`}>
        {INTRO_TEMPLATES.map(t => (
          <button key={t.id} type="button" onClick={() => choose(t)} data-testid={`intro-template-${t.id}`}
            className="text-left px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors">
            <span className="block text-[13px] font-semibold text-gray-900">{t.name}</span>
            <span className="block text-[12px] text-gray-500">{t.summary}</span>
          </button>
        ))}
      </div>

      {pending && (
        <div role="alert" data-testid="intro-replace" className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[13px] text-gray-800 flex-1">Replace what you wrote with the &ldquo;{pending.name}&rdquo; template?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { onChange(pending.text); setPending(null) }} data-testid="intro-replace-yes"
              className="h-9 px-3 text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">Replace</button>
            <button type="button" onClick={() => setPending(null)}
              className="h-9 px-3 text-[13px] font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Keep mine</button>
          </div>
        </div>
      )}

      <textarea id={`${id}-bio`} value={value} onChange={e => onChange(e.target.value)} rows={9}
        aria-describedby={`${id}-help`}
        placeholder="Tell your students who you help, what happens in a lesson, and why you."
        className="w-full text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-y" />
      <div id={`${id}-help`} className="mt-1.5 space-y-1.5">
        <p className="text-[12px] text-gray-500" data-testid="intro-counter">
          {length} characters. Aim for 400 to 900.{length < BIO_MIN_CHARS ? ` An introduction counts toward your profile from ${BIO_MIN_CHARS}.` : ''}
        </p>
        {left.length > 0 && (
          <p className="flex items-start gap-1.5 text-[12.5px] text-amber-800" data-testid="intro-unfilled">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{left.length === 1 ? '1 part is' : `${left.length} parts are`} still in [square brackets]: {left.slice(0, 3).join(' ')}{left.length > 3 ? ' ...' : ''}. Replace {left.length === 1 ? 'it' : 'them'} before you save.</span>
          </p>
        )}
        <p className="flex items-start gap-1.5 text-[12px] text-gray-600">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>A good introduction answers three questions: who do you help, what happens in a lesson, and why you?</span>
        </p>
      </div>
    </div>
  )
}
