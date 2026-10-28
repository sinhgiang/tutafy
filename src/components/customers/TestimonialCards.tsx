import Link from 'next/link'
import { Quote } from 'lucide-react'
import { httpsImage } from '@/lib/tutor-seo'
import { initialsOf } from '@/lib/tutor-profile'
import type { Testimonial } from '@/lib/testimonials'

/**
 * The tutor stories of /customers (T-1032). Plain markup with no browser state. It draws what it is given and trusts nothing: the page gives it only entries
 * that passed publishable() (src/lib/testimonials.ts), each with the tutor's written consent. The quote is printed as text, never as markup.
 */
export function TestimonialCards({ items }: { items: Testimonial[] }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="testimonials">
      {items.map(t => {
        const photo = t.photo ? httpsImage(t.photo) : undefined
        return (
          <li key={t.id} id={t.id} className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm flex flex-col" data-testid="testimonial">
            <Quote className="h-6 w-6 text-indigo-200 mb-3" aria-hidden="true" />
            <blockquote className="text-[15px] text-gray-700 leading-relaxed flex-1">“{t.quote}”</blockquote>
            {t.facts && t.facts.length > 0 && (
              <dl className="flex gap-6 mt-6" data-testid="testimonial-facts">
                {t.facts.map(f => (
                  <div key={f.label}>
                    <dd className="text-[22px] font-bold text-indigo-700">{f.value}</dd>
                    <dt className="text-[12px] text-gray-600">{f.label}</dt>
                  </div>
                ))}
              </dl>
            )}
            <div className="border-t border-gray-100 pt-4 mt-5 flex items-center gap-3">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={`Photo of ${t.name}`} width={48} height={48} loading="lazy" className="w-12 h-12 rounded-full object-cover bg-indigo-50" />
              ) : (
                <span aria-hidden="true" className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-[15px] font-bold">{initialsOf(t.name)}</span>
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{t.name}</p>
                <p className="text-[12.5px] text-gray-600">{t.role}</p>
                {t.tutorSlug && <Link href={`/tutors/${t.tutorSlug}`} className="inline-flex items-center min-h-11 text-[13px] font-semibold text-indigo-700 underline underline-offset-2" data-testid="testimonial-profile">See {t.name.split(' ')[0]}&apos;s profile</Link>}
              </div>
            </div>
            <p className="mt-3 text-[12px] text-gray-600">Shared with {t.name.split(' ')[0]}&apos;s permission, {new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(t.consent.on))}.</p>
          </li>
        )
      })}
    </ul>
  )
}
