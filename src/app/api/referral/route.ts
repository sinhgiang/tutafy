import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/referral â€” get current tutor's referral stats
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tutor } = await supabase.from('tutors').select('slug, referral_credits').eq('id', user.id).single()
  if (!tutor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { count } = await admin.from('tutors').select('id', { count: 'exact' }).eq('referred_by', user.id)

  return NextResponse.json({
    referral_code: tutor.slug,
    referral_link: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com'}/register?ref=${tutor.slug}`,
    referral_count: count ?? 0,
    credits: tutor.referral_credits ?? 0,
  })
}
