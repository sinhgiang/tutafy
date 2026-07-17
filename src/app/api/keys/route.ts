import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/apiAuth'

// Session-authenticated management of the tutor's own API keys (used by the
// dashboard, NOT by the public API). The raw key is returned exactly once on
// creation and never stored — only its prefix + SHA-256 hash live in the DB.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, created_at')
    .eq('tutor_id', user.id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ keys: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let name = 'API key'
  try { const b = await request.json(); if (b?.name) name = String(b.name).slice(0, 60) } catch { /* default name */ }

  const { key, prefix, hash } = generateApiKey()
  const { data, error } = await supabase
    .from('api_keys')
    .insert({ tutor_id: user.id, name, key_prefix: prefix, key_hash: hash })
    .select('id, name, key_prefix, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // `key` is only ever returned here — the tutor must copy it now.
  return NextResponse.json({ ...data, key }, { status: 201 })
}
