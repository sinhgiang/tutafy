import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*, students(name, email), tutors(name, email)')
    .eq('id', lessonId)
    .eq('tutor_id', user.id)
    .single()

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tutor = lesson.tutors as any
  const student = lesson.students as any
  const date = new Date(lesson.starts_at)
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const invoiceId = lessonId.slice(0, 8).toUpperCase()
  const statusColor = lesson.payment_status === 'paid' ? '#059669' : lesson.payment_status === 'refunded' ? '#dc2626' : '#d97706'
  const statusBg = lesson.payment_status === 'paid' ? '#ecfdf5' : lesson.payment_status === 'refunded' ? '#fef2f2' : '#fffbeb'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice #${invoiceId}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; }
  .page { max-width: 680px; margin: 40px auto; background: white; border-radius: 16px; padding: 48px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .logo { font-size: 20px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
  .logo span { color: #111; }
  .invoice-num { text-align: right; }
  .invoice-label { font-size: 28px; font-weight: 800; color: #111; }
  .invoice-id { font-size: 13px; color: #9ca3af; margin-top: 2px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
  .party-label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
  .party-name { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .party-email { font-size: 13px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; padding: 12px 0; border-bottom: 2px solid #f3f4f6; }
  th:last-child { text-align: right; }
  td { padding: 16px 0; font-size: 14px; color: #374151; border-bottom: 1px solid #f9fafb; vertical-align: top; }
  td:last-child { text-align: right; font-weight: 700; color: #111; }
  .total-row td { font-size: 16px; font-weight: 800; color: #111; border-bottom: none; border-top: 2px solid #f3f4f6; padding-top: 20px; }
  .time-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .status-row { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; }
  .status-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; }
  .status-badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .print-btn { background: #6366f1; color: white; border: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
  .print-btn:hover { background: #4f46e5; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; }
  @media print {
    body { background: white; }
    .page { margin: 0; box-shadow: none; border-radius: 0; }
    .print-btn { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">Tutafy</div>
    <div class="invoice-num">
      <div class="invoice-label">Invoice</div>
      <div class="invoice-id">#${invoiceId}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From</div>
      <div class="party-name">${tutor?.name ?? 'Tutor'}</div>
      <div class="party-email">${tutor?.email ?? ''}</div>
    </div>
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${student?.name ?? 'Student'}</div>
      <div class="party-email">${student?.email ?? ''}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Date</th>
        <th>Duration</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Language lesson</td>
        <td>
          ${dateLabel}
          <div class="time-sub">${timeLabel}</div>
        </td>
        <td>${lesson.duration_minutes} min</td>
        <td>${lesson.price ? `$${Number(lesson.price).toFixed(2)}` : '—'}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">Total due</td>
        <td>${lesson.price ? `$${Number(lesson.price).toFixed(2)}` : '—'}</td>
      </tr>
    </tbody>
  </table>

  <div class="status-row">
    <span class="status-label">Payment status</span>
    <span class="status-badge" style="background:${statusBg};color:${statusColor}">
      ${lesson.payment_status ?? 'pending'}
    </span>
  </div>

  <button class="print-btn" onclick="window.print()">
    🖨 Print / Save as PDF
  </button>

  <div class="footer">
    <p>Powered by Tutafy · tutafy.com · Invoice issued ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
