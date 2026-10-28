import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'
import { cleanLanguages } from '@/lib/directory'
import { parseLanguages } from '@/lib/tutor-languages'

// The languages a tutor teaches (T-1032): Settings > Profile reads them here and sends the typed list back. The column tutors.languages has been in the schema
// since the first migration, every public page reads it, and until now nothing wrote it.
//
// Who may write: the signed-in tutor, for their own row only. The tutor id is the session's and is never read from the body; the column is written with the
// tutor's OWN session (row level security, "Tutors can update own profile": their own row), so a call can never reach another tutor. What is saved is the
// CLEAN list (src/lib/tutor-languages.ts: letters only, 30 characters each, at most six, none twice), never the text that was typed. No migration is needed.
const perTutor = createLimiter({ max: 30, windowMs: 10 * 60 * 1000 })
/** The body is a short list of names: anything bigger is refused before it is read. */
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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('tutors').select('languages').eq('id', user.id).single()
  if (error || !data) return NextResponse.json({ error: 'We could not load your languages. Please try again.' }, { status: 500 })
  return NextResponse.json({ languages: cleanLanguages(data.languages) })
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ error: 'That list is too long.' }, { status: 413 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!perTutor.hit(user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Type the languages you teach, separated by commas.' }, { status: 400 })
  }
  const sent = body && typeof body === 'object' ? (body as Record<string, unknown>).languages : undefined
  if (sent === undefined) return NextResponse.json({ error: 'Type the languages you teach, separated by commas.' }, { status: 400 })
  const parsed = parseLanguages(sent)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: saved, error } = await supabase.from('tutors').update({ languages: parsed.languages }).eq('id', user.id).select('id')
  if (error || !saved || saved.length === 0) return NextResponse.json({ error: 'We could not save your languages. Please try again.' }, { status: 500 })
  return NextResponse.json({ languages: parsed.languages })
}
