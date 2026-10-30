import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyHoursPreset } from '@/lib/hours-presets'

// One-tap free hours (T-1105): the dashboard card and the empty Availability page send a preset id here and the tutor's weekly hours are written.
//
// Who may write: the signed-in tutor, for their own hours only. The tutor id is the session's and is never read from the body; the rows are written with the
// tutor's OWN session (row level security on `availability`), so a call can never reach another tutor. Only a tutor with no hours can use it (src/lib/hours-presets.ts).
// Nothing is sent to anyone. No migration is needed.
const MAX_BODY_BYTES = 512

/** Same-origin calls only: the Origin header must name the host this request was sent to. */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ error: 'Choose one of the schedules.' }, { status: 413 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Choose one of the schedules.' }, { status: 400 })
  }
  const preset = typeof body === 'object' && body !== null ? (body as { preset?: unknown }).preset : undefined

  const result = await applyHoursPreset(supabase, user.id, preset)
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status })
  return NextResponse.json({ ok: true, saved: result.saved, label: result.preset.label, detail: result.preset.detail })
}
