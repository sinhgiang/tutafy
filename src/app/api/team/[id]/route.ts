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
  if (body.bio !== undefined) patch.bio = body.bio ? String(body.bio).slice(0, 1000) : null
  if (body.avatar_url !== undefined) patch.avatar_url = body.avatar_url ? String(body.avatar_url) : null
  if (body.timezone !== undefined) patch.timezone = body.timezone ? String(body.timezone) : null
  if (body.booking_url_active !== undefined) patch.booking_url_active = Boolean(body.booking_url_active)
  if (body.slug !== undefined) {
    const s = String(body.slug).toLowerCase().trim()
    if (!/^[a-z0-9-]{3,60}$/.test(s)) return NextResponse.json({ error: 'Slug must be 3-60 characters: letters, numbers, hyphens only' }, { status: 400 })
    patch.slug = s
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const { data, error } = await supabase
    .from('team_members')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('id, name, email, pay_type, pay_rate, active, slug, bio, avatar_url, timezone, booking_url_active, created_at')
    .maybeSingle() // no row of this owner with this id is a 404 below, not a database error (T-0841)
  if (error) {
    if (error.message.includes('team_members_owner_slug_idx') || error.code === '23505') {
      return NextResponse.json({ error: 'That booking link is already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Could not save the team member' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ member: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabase.from('team_members').delete().eq('id', id).eq('owner_id', user.id).select('id')
  if (error) return NextResponse.json({ error: 'Could not remove the team member' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
