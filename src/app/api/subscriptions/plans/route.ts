// Subscription plans of the signed-in tutor (T-0825). A Pro feature, plan re-read on every call, the tutor id is the session's.
// A new plan goes through validatePlan; a change may touch only is_active, name and description (pickPlanUpdates): the old route
// wrote whatever the body held, so a tutor could have rewritten tutor_id or id of their own row.
import { NextRequest, NextResponse } from 'next/server'
import { requireApiPlan } from '@/lib/api-guard'
import { isUuid } from '@/lib/list-params'
import { pickPlanUpdates, validatePlan } from '@/lib/business-lists'

export async function GET() {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const { data, error } = await gate.supabase.from('subscription_plans').select('*').eq('tutor_id', gate.userId).order('created_at', { ascending: false })
  if (error) {
    if (error.message.includes('does not exist')) return NextResponse.json({ plans: [], migrationRequired: true })
    return NextResponse.json({ error: 'Could not load your plans' }, { status: 500 })
  }
  // the tutor's own booking page address for the "Copy link" button of each plan (T-0841): the slug of the session's own row
  const { data: me } = await gate.supabase.from('tutors').select('slug').eq('id', gate.userId).maybeSingle()
  return NextResponse.json({ plans: data ?? [], slug: (me as { slug?: string | null } | null)?.slug ?? null })
}

export async function POST(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const check = validatePlan(await req.json().catch(() => null))
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
  const { data, error } = await gate.supabase.from('subscription_plans').insert({ tutor_id: gate.userId, ...check.value }).select().single()
  if (error) return NextResponse.json({ error: 'Could not save the plan' }, { status: 500 })
  return NextResponse.json({ plan: data })
}

export async function DELETE(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const body = await req.json().catch(() => null) as { id?: unknown } | null
  if (!isUuid(body?.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await gate.supabase.from('subscription_plans').delete().eq('id', body!.id as string).eq('tutor_id', gate.userId).select('id')
  if (error) return NextResponse.json({ error: 'Could not delete the plan' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const gate = await requireApiPlan('pro')
  if ('error' in gate) return gate.error
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!isUuid(body?.id)) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const updates = pickPlanUpdates(body)
  if (!updates.ok) return NextResponse.json({ error: updates.error }, { status: 400 })
  const { data, error } = await gate.supabase.from('subscription_plans').update(updates.value).eq('id', body!.id as string).eq('tutor_id', gate.userId).select('id')
  if (error) return NextResponse.json({ error: 'Could not update the plan' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
