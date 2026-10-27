// Calendar (T-0823): the week by default, or the month; the address says which (?view=week|month&date=YYYY-MM-DD).
// Reads only the signed-in tutor's own lessons for the days the view draws.
import { redirect } from 'next/navigation'
import { CircleAlert, RotateCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadTutorCurrency } from '@/lib/tutor-currency'
import { dayKey, parseDay, parseView, rangeFor } from '@/lib/calendar'
import CalendarView, { type CalLesson } from './CalendarView'

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v }
  const view = parseView(one('view'))
  const anchor = parseDay(one('date'), new Date())

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { from, to } = rangeFor(view, anchor)
  const { data, error } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, status, price, students(name)')
    .eq('tutor_id', user.id)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at')

  if (error) {
    return (
      <div>
        <div className="dash-head"><div><h1>Calendar</h1><p>Your lesson schedule</p></div></div>
        <div className="dash-card dash-state" role="alert" data-testid="calendar-error">
          <div className="dash-state-ico"><CircleAlert className="h-6 w-6" aria-hidden="true" /></div>
          <h2>We could not load your calendar</h2>
          <p>Nothing was changed. Check your connection and try again.</p>
          <div className="dash-state-actions"><Link href={`/calendar?view=${view}&date=${dayKey(anchor)}`} className="dash-btn is-primary"><RotateCw className="h-4 w-4" aria-hidden="true" /> Try again</Link></div>
        </div>
      </div>
    )
  }

  const currency = await loadTutorCurrency(supabase, user.id)
  return <CalendarView view={view} anchor={dayKey(anchor)} lessons={(data ?? []) as unknown as CalLesson[]} currency={currency} />
}
