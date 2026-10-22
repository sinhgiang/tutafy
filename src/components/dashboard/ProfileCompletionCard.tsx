'use client'

// "Make your profile ready for students" (T-0765): the percentage and the to-do list on the tutor dashboard. The numbers come from the
// server (src/lib/profile-completion.ts); this file draws them and copies the public link. At 100% the card shrinks to one line.
import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Eye, ArrowRight } from 'lucide-react'
import type { ProfileCompletion } from '@/lib/profile-completion'

/** The card as HTML, with no browser state: what the server and the tests render. */
export function ProfileCompletionView({ card, onCopy, copied }: { card: ProfileCompletion; onCopy?: () => void; copied?: boolean }) {
  const shownUrl = card.profileUrl ? card.profileUrl.replace(/^https?:\/\//, '') : null

  if (card.complete) {
    return (
      <section aria-label="Profile complete" data-testid="profile-completion-done"
        className="bg-white rounded-2xl border border-emerald-100 mb-4 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0" aria-hidden="true">
            <Check className="h-4.5 w-4.5" strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-gray-900">Your profile is complete</p>
            <p className="text-[13px] text-gray-500">Share your page. Most students arrive from a link you send.</p>
          </div>
        </div>
        {shownUrl && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-gray-700 truncate min-w-0" data-testid="profile-url">{shownUrl}</span>
            <button type="button" onClick={onCopy} data-testid="copy-profile-link"
              className="flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        )}
      </section>
    )
  }

  const nextId = card.steps.find(s => !s.done && !s.soon)?.id
  return (
    <section aria-labelledby="profile-completion-title" data-testid="profile-completion-card" className="bg-white rounded-2xl border border-indigo-100 mb-4 overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 id="profile-completion-title" className="text-[16px] font-bold text-gray-900">Make your profile ready for students</h2>
          <p className="text-[13px] text-gray-500 mt-0.5 max-w-xl">Students decide in a few seconds. A complete profile gives them a reason to book a trial lesson.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-12 h-12 rounded-full" aria-hidden="true"
            style={{ background: `conic-gradient(#4F46E5 ${card.percent * 3.6}deg, #E5E7EB 0deg)` }}>
            <div className="absolute inset-[5px] rounded-full bg-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[24px] font-extrabold text-gray-900" data-testid="profile-percent">{card.percent}%</p>
            <p className="text-[12px] text-gray-500">complete</p>
          </div>
        </div>
      </div>
      <div className="mx-5 h-1.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={card.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Profile ${card.percent}% complete`}>
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${card.percent}%` }} />
      </div>
      <ol className="px-5 pb-2 pt-2 divide-y divide-gray-50">
        {card.steps.map(s => {
          const isNext = s.id === nextId
          return (
            <li key={s.id} data-step={s.id} data-done={s.done ? 'true' : 'false'} data-soon={s.soon ? 'true' : 'false'}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 ${isNext ? 'bg-indigo-50/70 -mx-5 px-5' : ''}`}>
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-emerald-600 text-white' : isNext ? 'border-2 border-indigo-600' : 'border-2 border-gray-300'}`} aria-hidden="true">
                  {s.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <div className="min-w-0">
                  <p className={`text-[14px] font-semibold ${s.done || s.soon ? 'text-gray-600' : 'text-gray-900'}`}>
                    <span className="sr-only">{s.done ? 'Done: ' : s.soon ? 'Coming soon: ' : 'To do: '}</span>
                    {s.title}
                    {!s.done && s.weight > 0 && <span className="ml-2 align-middle text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">+{s.weight}%</span>}
                  </p>
                  <p className="text-[13px] text-gray-500">{s.done ? 'Done' : s.hint}</p>
                </div>
              </div>
              {!s.done && !s.soon && (
                <div className="pl-8 sm:pl-0 sm:shrink-0">
                  <Link href={s.href} data-testid={`go-${s.id}`}
                    className={`inline-flex items-center justify-center h-10 px-4 text-[13px] font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${isNext ? 'text-white bg-indigo-600 hover:bg-indigo-700' : 'text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50'}`}>
                    {s.action}
                  </Link>
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {shownUrl && card.profilePath && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="flex items-center gap-1.5 text-[13px] text-gray-600 min-w-0">
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span className="shrink-0">Your public page:</span> <b className="truncate" data-testid="profile-url">{shownUrl}</b>
          </p>
          <Link href={card.profilePath} target="_blank" rel="noopener" data-testid="preview-profile"
            className="flex items-center gap-1 text-[13px] font-semibold text-indigo-700 hover:text-indigo-900 shrink-0">
            Preview how students see it <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  )
}

export function ProfileCompletionCard({ card }: { card: ProfileCompletion }) {
  const [copied, setCopied] = useState(false)
  return (
    <ProfileCompletionView
      card={card}
      copied={copied}
      onCopy={() => {
        if (!card.profileUrl) return
        navigator.clipboard.writeText(card.profileUrl).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => { /* clipboard blocked: the address is printed beside the button */ })
      }}
    />
  )
}
