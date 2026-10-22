import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'
import { checkAvatarBody, ownAvatarPath } from '@/lib/avatar-image'

// The tutor's profile photo (T-0766): Settings > Profile uploads it here; it is shown on the public profile, the directory and the booking page
// through `tutors.avatar_url`. The files live in the public bucket `tutor-avatars` (supabase/migrations/024_tutor_avatars.sql, written but NOT
// applied: the owner runs it). The bucket has NO write policy, so only this route (the server's own key) can put a file there.
//
// Who may write: the signed-in tutor, for their own photo only. The tutor id is the session's, never taken from the body; the file goes into
// that tutor's own folder; `tutors.avatar_url` is updated with the tutor's OWN session (row level security: their own row), and a photo address
// that is not in their own folder is never deleted. The picture is checked by its real bytes and cleaned of hidden notes (src/lib/avatar-image.ts).
// Nothing is created at run time: if the bucket does not exist yet the answer is 503, not a quietly made bucket.
const BUCKET = 'tutor-avatars'
const perTutor = createLimiter({ max: 10, windowMs: 10 * 60 * 1000 })
/** A photo of the most bytes, as base64 in JSON, with room for the rest of the body. */
const MAX_BODY_BYTES = 3 * 1024 * 1024

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

const NOT_READY = 'Photo upload is not set up yet. Please try again later.'

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: 'That photo is too big. Use one under 2 MB.' }, { status: 413 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!perTutor.hit(user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Choose a photo to upload.' }, { status: 400 })
  }
  const photo = checkAvatarBody(body)
  if (!photo.ok) return NextResponse.json({ error: photo.error }, { status: photo.status })

  const admin = createAdminClient()
  const storage = admin.storage.from(BUCKET)
  const base = storage.getPublicUrl('x').data.publicUrl.slice(0, -1)

  const { data: before } = await supabase.from('tutors').select('avatar_url').eq('id', user.id).maybeSingle()

  // a new name every time: a replaced photo is never served from a cache under its old address
  const path = `${user.id}/${randomUUID()}.${photo.ext}`
  const { error: uploadError } = await storage.upload(path, photo.bytes, { contentType: photo.type, upsert: false })
  if (uploadError) {
    const missing = /bucket not found|not found/i.test(uploadError.message ?? '')
    return NextResponse.json({ error: missing ? NOT_READY : 'We could not save the photo. Please try again.' }, { status: missing ? 503 : 500 })
  }
  const url = `${base}${path}`

  const { data: saved, error: saveError } = await supabase.from('tutors').update({ avatar_url: url }).eq('id', user.id).select('id')
  if (saveError || !saved || saved.length === 0) {
    await storage.remove([path]) // nothing points at the new file: take it back
    return NextResponse.json({ error: 'We could not save the photo. Please try again.' }, { status: 500 })
  }

  const old = ownAvatarPath(before?.avatar_url, base, user.id)
  if (old) await storage.remove([old]).catch(() => {})
  return NextResponse.json({ url })
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storage = createAdminClient().storage.from(BUCKET)
  const base = storage.getPublicUrl('x').data.publicUrl.slice(0, -1)
  const { data: before } = await supabase.from('tutors').select('avatar_url').eq('id', user.id).maybeSingle()

  const { data: saved, error } = await supabase.from('tutors').update({ avatar_url: null }).eq('id', user.id).select('id')
  if (error || !saved || saved.length === 0) return NextResponse.json({ error: 'We could not remove the photo. Please try again.' }, { status: 500 })

  const old = ownAvatarPath(before?.avatar_url, base, user.id)
  if (old) await storage.remove([old]).catch(() => {})
  return NextResponse.json({ ok: true })
}
