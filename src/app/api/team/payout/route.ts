import { NextResponse } from 'next/server'
import { requireApiPlan } from '@/lib/api-guard'

// POST /api/team/payout — record that a team member was paid (a log entry).
// Body: { memberId, amount, period_start?, period_end?, note? }
export async function POST(request: Request) {
  const gate = await requireApiPlan('academy')
  if ('error' in gate) return gate.error
  const { supabase, userId: user } = gate

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const memberId = (body?.memberId ?? '').toString()
  const amount = Number(body?.amount)
  if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
  if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })

  const { data: m } = await supabase.from('team_members').select('id').eq('id', memberId).eq('owner_id', user).maybeSingle()
  if (!m) return NextResponse.json({ error: 'team member not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('payroll_payouts')
    .insert({
      owner_id: user, member_id: memberId, amount,
      period_start: body.period_start || null, period_end: body.period_end || null,
      note: body.note ? String(body.note).slice(0, 200) : null,
    })
    .select('id, amount, period_start, period_end, paid_at')
    .single()
  if (error) return NextResponse.json({ error: 'Could not record the payout' }, { status: 500 })
  return NextResponse.json({ payout: data }, { status: 201 })
}
