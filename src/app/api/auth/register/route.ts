import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function generateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

export async function POST(request: NextRequest) {
  const { userId, email, name } = await request.json()

  if (!userId || !email || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin.from('tutors').insert({
    id: userId,
    email,
    name,
    slug: generateSlug(name),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
