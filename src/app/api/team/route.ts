import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireApiPlan } from '@/lib/api-guard'

const PAY_TYPES = ['per_lesson', 'per_hour', 'revenue_share']
const MAX_TEAM_SEATS = 5
const MEMBER_FIELDS = 'id, name, email, pay_type, pay_rate, active, slug, bio, avatar_url, timezone, booking_url_active, created_at'

function generateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('team_members')
    .select(MEMBER_FIELDS)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireApiPlan('academy')
  if ('error' in gate) return gate.error
  const { supabase, userId: user } = gate

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const name = (body?.name ?? '').toString().trim()
  const payType = (body?.pay_type ?? 'per_lesson').toString()
  const payRate = Number(body?.pay_rate)
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!PAY_TYPES.includes(payType)) return NextResponse.json({ error: 'invalid pay_type' }, { status: 400 })
  if (!Number.isFinite(payRate) || payRate < 0) return NextResponse.json({ error: 'pay_rate must be a positive number' }, { status: 400 })

  const { count } = await supabase
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user)
  if ((count ?? 0) >= MAX_TEAM_SEATS) {
    return NextResponse.json({ error: `Academy plan is limited to ${MAX_TEAM_SEATS} tutors.` }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert({ owner_id: user, name, email: body.email ? String(body.email).trim() : null, pay_type: payType, pay_rate: payRate, slug: generateSlug(name) })
    .select(MEMBER_FIELDS)
    .single()
  if (error) {
    if (error.message === 'team_seat_limit_reached') {
      return NextResponse.json({ error: `Academy plan is limited to ${MAX_TEAM_SEATS} tutors.` }, { status: 403 })
    }
    if (error.message === 'team_requires_academy') {
      return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ member: data }, { status: 201 })
}
