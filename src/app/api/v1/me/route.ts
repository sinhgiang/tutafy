import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/apiAuth'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/v1/me — returns the authenticated tutor. Zapier uses this as the
// connection/auth test when a user pastes their API key.
export async function GET(request: Request) {
  const caller = await authenticateApiKey(request)
  if (!caller) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: tutor } = await supabase
    .from('tutors')
    .select('id, name, email, slug, subscription_status')
    .eq('id', caller.tutorId)
    .single()
  if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

  return NextResponse.json({
    id: tutor.id,
    name: tutor.name,
    email: tutor.email,
    slug: tutor.slug,
    plan: tutor.subscription_status ?? 'free',
  })
}
