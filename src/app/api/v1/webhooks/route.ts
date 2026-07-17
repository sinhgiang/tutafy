import { NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/apiAuth'
import { createAdminClient } from '@/lib/supabase/server'
import { WEBHOOK_EVENTS, isWebhookEvent } from '@/lib/webhooks'

function isHttpUrl(u: string): boolean {
  try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:' } catch { return false }
}

// GET /api/v1/webhooks — list this tutor's webhook subscriptions.
export async function GET(request: Request) {
  const caller = await authenticateApiKey(request)
  if (!caller) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('webhook_subscriptions')
    .select('id, event, target_url, created_at')
    .eq('tutor_id', caller.tutorId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ subscriptions: data ?? [], available_events: WEBHOOK_EVENTS })
}

// POST /api/v1/webhooks — subscribe a URL to an event (Zapier REST-hook subscribe).
// Body: { event, target_url }. Returns { id } for later unsubscribe.
export async function POST(request: Request) {
  const caller = await authenticateApiKey(request)
  if (!caller) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const event = (body?.event ?? '').toString().trim()
  const targetUrl = (body?.target_url ?? body?.targetUrl ?? '').toString().trim()

  if (!isWebhookEvent(event)) {
    return NextResponse.json({ error: `Unknown event. Allowed: ${WEBHOOK_EVENTS.join(', ')}` }, { status: 400 })
  }
  if (!isHttpUrl(targetUrl)) {
    return NextResponse.json({ error: 'target_url must be a valid http(s) URL' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .insert({ tutor_id: caller.tutorId, event, target_url: targetUrl })
    .select('id, event, target_url, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
