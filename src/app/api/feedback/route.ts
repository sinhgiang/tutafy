import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'
import { verifyStudentToken } from '@/lib/student-auth'
import { parseFeedbackBody } from '@/lib/feedback'

// The Feedback box of the tutor dashboard and of the student page (supabase/migrations/020_feedback.sql).
//
// Who is writing is never taken from the body: a signed-in tutor is the session's account; a student is the email of a valid,
// signed student link (the same link the student page was opened with). Anything else is refused with 401. The body carries only
// the kind, the text and (students) that link. Nothing else about the sender is read or kept: no address, browser or page.
//
// Limits: `overall` caps what an unknown caller can cause; `perAccount` is counted on the real account (the session's id, or the
// email of a valid link), never on a value the caller makes up. Both live in this instance's memory; the table has its own,
// stricter limit that holds across instances (a trigger: 10 an hour per author).
const perAccount = createLimiter({ max: 5, windowMs: 10 * 60 * 1000 })
const overall = createLimiter({ max: 120, windowMs: 60 * 1000 })

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

const TF429 = 'TF429' // the table's own limit (migration 020)

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Send the kind and your message.' }, { status: 400 })
  }
  const parsed = parseFeedbackBody(json)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { kind, message, token } = parsed.data

  if (!overall.hit('all')) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const admin = createAdminClient()

  // Who is writing: a valid student link, or else the signed-in tutor. Nobody else.
  let role: 'tutor' | 'student'
  let email: string
  let tutorId: string | null = null
  if (token) {
    const link = verifyStudentToken(token)
    if (!link.valid || !link.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    role = 'student'
    email = link.email.toLowerCase().trim()
  } else {
    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tutor } = await admin.from('tutors').select('id, email').eq('id', user.id).maybeSingle()
    if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    role = 'tutor'
    tutorId = user.id
    email = String(tutor.email ?? user.email ?? '').toLowerCase().trim()
  }
  if (email.length < 3 || email.length > 254) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!perAccount.hit(`${role}:${email}`)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { error } = await admin.from('feedback').insert({ author_role: role, tutor_id: tutorId, author_email: email, kind, message })
  if (error) {
    if ((error as { code?: string }).code === TF429) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    // most likely the table is not there yet (migration 020 not applied); say it plainly, keep the details out of the answer
    console.error('feedback not saved:', (error as { message?: string }).message ?? 'unknown error')
    return NextResponse.json({ error: 'Feedback is not available right now. Please try again later.' }, { status: 503 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}
