import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAY_TYPES = ['per_lesson', 'per_hour', 'revenue_share']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('team_members')
    .select('id, name, email, pay_type, pay_rate, active, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const name = (body?.name ?? '').toString().trim()
  const payType = (body?.pay_type ?? 'per_lesson').toString()
  const payRate = Number(body?.pay_rate)
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!PAY_TYPES.includes(payType)) return NextResponse.json({ error: 'invalid pay_type' }, { status: 400 })
  if (!Number.isFinite(payRate) || payRate < 0) return NextResponse.json({ error: 'pay_rate must be a positive number' }, { status: 400 })

  const { data, error } = await supabase
    .from('team_members')
    .insert({ owner_id: user.id, name, email: body.email ? String(body.email).trim() : null, pay_type: payType, pay_rate: payRate })
    .select('id, name, email, pay_type, pay_rate, active, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data }, { status: 201 })
}
