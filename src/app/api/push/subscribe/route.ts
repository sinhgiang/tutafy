import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { subscription, portalToken } = body

  if (!subscription || !subscription.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Student via portal token
  if (portalToken) {
    await admin
      .from('students')
      .update({ push_subscription: subscription } as any)
      .eq('portal_token', portalToken)
    return NextResponse.json({ ok: true })
  }

  // Tutor via session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await admin
    .from('tutors')
    .update({ push_subscription: subscription } as any)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
