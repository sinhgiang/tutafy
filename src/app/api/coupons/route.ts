// Coupon codes of the signed-in tutor (T-0825). A Pro feature, plan re-read on every call; the tutor id is the session's;
// a new coupon goes through validateCoupon (code charset and length, percentage 1 to 100, whole max uses, a real date).
import { NextRequest, NextResponse } from 'next/server'
import { requireApiPlan } from '@/lib/api-guard'
import { isUuid } from '@/lib/list-params'
import { validateCoupon } from '@/lib/business-lists'

export const dynamic = 'force-dynamic'

export async function GET() {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const { data, error } = await gate.supabase.from('coupons').select('*').eq('tutor_id', gate.userId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Could not load coupons' }, { status: 500 })
  return NextResponse.json({ coupons: data ?? [] })
}

export async function POST(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const check = validateCoupon(await req.json().catch(() => null))
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const { data, error } = await gate.supabase.from('coupons').insert({ tutor_id: gate.userId, ...check.value }).select().single()
  if (error) return NextResponse.json({ error: /duplicate|unique/i.test(error.message) ? 'You already have a coupon with that code' : 'Could not save the coupon' }, { status: 400 })
  return NextResponse.json({ coupon: data })
}

export async function DELETE(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const body = await req.json().catch(() => null) as { id?: unknown } | null
  if (!isUuid(body?.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data } = await gate.supabase.from('coupons').delete().eq('id', body!.id as string).eq('tutor_id', gate.userId).select('id')
  if (!data || data.length === 0) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
