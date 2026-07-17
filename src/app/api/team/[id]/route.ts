import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAY_TYPES = ['per_lesson', 'per_hour', 'revenue_share']

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) { const n = String(body.name).trim(); if (!n) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 }); patch.name = n }
  if (body.email !== undefined) patch.email = body.email ? String(body.email).trim() : null
  if (body.pay_type !== undefined) { if (!PAY_TYPES.includes(body.pay_type)) return NextResponse.json({ error: 'invalid pay_type' }, { status: 400 }); patch.pay_type = body.pay_type }
  if (body.pay_rate !== undefined) { const r = Number(body.pay_rate); if (!Number.isFinite(r) || r < 0) return NextResponse.json({ error: 'invalid pay_rate' }, { status: 400 }); patch.pay_rate = r }
  if (body.active !== undefined) patch.active = Boolean(body.active)
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const { data, error } = await supabase
    .from('team_members')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id, name, email, pay_type, pay_rate, active, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ member: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('team_members').delete().eq('id', id).eq('owner_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
