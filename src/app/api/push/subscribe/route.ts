import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { cleanPushSubscription } from '@/lib/push-subscription'

// Saves a browser's push address. A student is named by the portal token (their own row); a tutor by the session. A tutor's row is the
// one whose `id` is the signed-in account's id (`tutors` has no `user_id` column: reading one made this save nothing for every tutor).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { subscription?: unknown; portalToken?: unknown } | null
  const subscription = cleanPushSubscription(body?.subscription)
  if (!subscription) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  const admin = createAdminClient()

  // Student via portal token
  if (body?.portalToken) {
    if (typeof body.portalToken !== 'string' || body.portalToken.length > 200) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    await admin
      .from('students')
      .update({ push_subscription: subscription })
      .eq('portal_token', body.portalToken)
    return NextResponse.json({ ok: true })
  }

  // Tutor via session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('tutors')
    .update({ push_subscription: subscription })
    .eq('id', user.id)
    .select('id')
  if (error) return NextResponse.json({ error: 'Could not save the notification address' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
