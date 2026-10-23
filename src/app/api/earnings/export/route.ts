// CSV of the payment history shown on the Earnings page (T-0821), for the period and status the page shows.
// Any signed-in tutor can export their OWN lessons (the table is on the Free plan too): the tutor id is the
// session's, never a query value, and the period and status are read through fixed lists.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadTutorCurrency } from '@/lib/tutor-currency'
import { computeEarnings, filterHistory, historyCsv, parsePeriod, parseStatus, type LessonRow } from '@/lib/earnings'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const period = parsePeriod(url.searchParams.get('period'))
  const status = parseStatus(url.searchParams.get('status'))

  const { data, error } = await supabase
    .from('lessons')
    .select('id, starts_at, price, payment_status, status, duration_minutes, students(id, name)')
    .eq('tutor_id', user.id)
    .order('starts_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'could_not_load' }, { status: 500 })

  const currency = await loadTutorCurrency(supabase, user.id)
  const rows = filterHistory(computeEarnings((data ?? []) as unknown as LessonRow[], new Date(), period).history, status)
  return new Response(historyCsv(rows, currency), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tutafy-earnings-${period}-${status}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
