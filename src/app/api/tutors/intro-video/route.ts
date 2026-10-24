import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'
import { parseIntroVideo } from '@/lib/intro-video'

// The tutor's intro video (T-0915): Settings > Profile sends the pasted link here. Only a link to ONE YouTube or Vimeo video is kept (src/lib/intro-video.ts
// decides, and the address that is saved is REBUILT from the provider and the video id, never the text that was typed). Nothing of the video is stored
// on Tutafy. The same rule runs again when the profile is drawn.
//
// Who may write: the signed-in tutor, for their own row only. The tutor id is the session's and is never read from the body; the column is written with the
// tutor's OWN session (row level security: their own row), so a call can never reach another tutor. The database also refuses anything but the two rebuilt
// forms (supabase/migrations/028_intro_video_and_established.sql, written but NOT applied: the owner runs it). Until then the answer is 503, not a guess.
const perTutor = createLimiter({ max: 30, windowMs: 10 * 60 * 1000 })
/** The body is one short address: anything bigger is refused before it is read. */
const MAX_BODY_BYTES = 4096

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

const NOT_READY = 'The intro video is not available yet. Please try again later.'
/** A missing column (42703, or PostgREST's PGRST204) means the migration is not applied yet. */
const columnMissing = (e: { code?: string } | null) => e?.code === '42703' || e?.code === 'PGRST204'

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ error: 'That link is too long. Paste the link to the video itself.' }, { status: 413 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!perTutor.hit(user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Paste a link to a YouTube or Vimeo video.' }, { status: 400 })
  }
  const url = body && typeof body === 'object' ? (body as Record<string, unknown>).url : undefined
  const parsed = parseIntroVideo(url)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: saved, error } = await supabase.from('tutors').update({ intro_video_url: parsed.video.canonical }).eq('id', user.id).select('id')
  if (error) {
    if (columnMissing(error)) return NextResponse.json({ error: NOT_READY }, { status: 503 })
    if (error.code === '23514') return NextResponse.json({ error: 'That link cannot be used. Paste the link to a single YouTube or Vimeo video.' }, { status: 400 })
    return NextResponse.json({ error: 'We could not save the video. Please try again.' }, { status: 500 })
  }
  if (!saved || saved.length === 0) return NextResponse.json({ error: 'We could not save the video. Please try again.' }, { status: 500 })
  return NextResponse.json({ url: parsed.video.canonical, provider: parsed.video.provider })
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!perTutor.hit(user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { data: saved, error } = await supabase.from('tutors').update({ intro_video_url: null }).eq('id', user.id).select('id')
  if (error) {
    if (columnMissing(error)) return NextResponse.json({ error: NOT_READY }, { status: 503 })
    return NextResponse.json({ error: 'We could not remove the video. Please try again.' }, { status: 500 })
  }
  if (!saved || saved.length === 0) return NextResponse.json({ error: 'We could not remove the video. Please try again.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
