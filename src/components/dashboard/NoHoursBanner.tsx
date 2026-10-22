// The banner for a tutor with no free hours (T-0739). Plain HTML with no browser state, so the server and
// the tests render the same thing. The words and the link come from src/lib/no-hours-banner.ts.
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'
import type { NoHoursBanner as Banner } from '@/lib/no-hours-banner'

export function NoHoursBanner({ banner }: { banner: Banner }) {
  return (
    <section role="region" aria-labelledby="no-hours-title" data-testid="no-hours-banner"
      className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0" aria-hidden="true">
          <CalendarClock className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <h2 id="no-hours-title" className="text-[15px] font-bold text-gray-900">{banner.title}</h2>
          <p className="text-[13.5px] text-gray-700">{banner.text}</p>
        </div>
      </div>
      <Link href={banner.href} data-testid="no-hours-banner-button"
        className="flex items-center justify-center h-10 px-5 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-xl whitespace-nowrap">
        {banner.action}
      </Link>
    </section>
  )
}
