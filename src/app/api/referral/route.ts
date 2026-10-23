import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { referredRow } from '@/lib/referral'

// GET /api/referral: the signed-in tutor's referral link, counts and the tutors they referred.
// The list holds a first name with the first letter of the last name, the join date and whether that tutor is on a paid plan:
// never an email, an id or a full name (T-0826). Only tutors whose `referred_by` is the session's tutor are read.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tutor } = await supabase.from('tutors').select('slug, referral_credits').eq('id', user.id).single()
  if (!tutor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: referred, error, count } = await admin.from('tutors').select('name, created_at, subscription_status', { count: 'exact' })
    .eq('referred_by', user.id).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'Could not load your referrals' }, { status: 500 })

  return NextResponse.json({
    referral_code: tutor.slug,
    referral_link: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com'}/register?ref=${tutor.slug}`,
    referral_count: count ?? 0,
    credits: tutor.referral_credits ?? 0,
    referred: ((referred ?? []) as { name: string | null; created_at: string; subscription_status: string | null }[]).map(referredRow),
  })
}
