import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const year = url.searchParams.get('year') ?? new Date().getFullYear().toString()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, price, payment_status, students(name, email)')
    .eq('tutor_id', user.id)
    .eq('status', 'completed')
    .gte('starts_at', `${year}-01-01`)
    .lte('starts_at', `${year}-12-31`)
    .order('starts_at', { ascending: true })

  const rows = [
    ['Date', 'Student', 'Duration (min)', 'Amount (USD)', 'Payment Status'],
    ...(lessons ?? []).map(l => [
      new Date(l.starts_at).toLocaleDateString('en-US'),
      (l.students as any)?.name ?? '',
      l.duration_minutes,
      l.price ?? 0,
      l.payment_status ?? 'pending',
    ])
  ]

  const total = (lessons ?? []).reduce((s, l) => s + (Number(l.price) || 0), 0)
  rows.push([])
  rows.push(['TOTAL', '', '', total.toFixed(2), ''])

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tutafy-earnings-${year}.csv"`,
    }
  })
}
