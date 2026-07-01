import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { code, tutor_id } = await req.json()
  if (!code || !tutor_id) return NextResponse.json({ valid: false, error: 'Missing fields' })

  const supabase = createAdminClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('tutor_id', tutor_id)
    .eq('code', code.trim().toUpperCase())
    .eq('active', true)
    .single()

  if (!coupon) return NextResponse.json({ valid: false, error: 'Invalid coupon code' })
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Coupon has expired' })
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: 'Coupon usage limit reached' })
  }

  return NextResponse.json({
    valid: true,
    coupon_id: coupon.id,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
  })
}
