import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('coupons')
    .select('*')
    .eq('tutor_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ coupons: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code, discount_type, discount_value, max_uses, expires_at } = await req.json()
  if (!code?.trim() || !discount_type || !discount_value) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase.from('coupons').insert({
    tutor_id: user.id,
    code: code.trim().toUpperCase(),
    discount_type,
    discount_value: Number(discount_value),
    max_uses: max_uses ? Number(max_uses) : null,
    expires_at: expires_at || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ coupon: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('coupons').delete().eq('id', id).eq('tutor_id', user.id)
  return NextResponse.json({ ok: true })
}
