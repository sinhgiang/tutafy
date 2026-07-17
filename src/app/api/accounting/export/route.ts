import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAccountingCsv, lessonToInvoiceRow, type AccountingProvider } from '@/lib/accounting'

// GET /api/accounting/export?provider=xero|quickbooks&year=YYYY
// Downloads an invoice CSV of completed, priced lessons ready to import into
// Xero or QuickBooks Online.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const provider = (url.searchParams.get('provider') === 'quickbooks' ? 'quickbooks' : 'xero') as AccountingProvider
  const year = url.searchParams.get('year') ?? String(new Date().getFullYear())

  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, price, status, students(name)')
    .eq('tutor_id', user.id)
    .eq('status', 'completed')
    .gte('starts_at', `${year}-01-01`)
    .lte('starts_at', `${year}-12-31T23:59:59`)
    .order('starts_at', { ascending: true })

  const rows = (lessons ?? [])
    .filter((l: any) => (Number(l.price) || 0) > 0)
    .map((l: any) => lessonToInvoiceRow({
      id: l.id, starts_at: l.starts_at, duration_minutes: l.duration_minutes, price: l.price,
      student_name: l.students?.name ?? null,
    }))

  const csv = generateAccountingCsv(provider, rows)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tutafy-${provider}-invoices-${year}.csv"`,
    },
  })
}
