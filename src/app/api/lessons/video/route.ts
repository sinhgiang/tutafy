import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createZoomMeeting } from '@/lib/zoom'
import { isValidMeetingUrl } from '@/lib/video'

// Set a lesson's video platform. Actions:
//   builtin → clear the external link (use the built-in room)
//   zoom    → auto-create a Zoom meeting and store its join URL
//   custom  → store a tutor-pasted URL (Google Meet or any https link)
// The external URL lives in `lessons.zoom_link`, which every Join point reads.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { lessonId?: string; action?: string; url?: string; topic?: string; startTime?: string; duration?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { lessonId, action } = body
  if (!lessonId || !action) return NextResponse.json({ error: 'Missing lessonId or action' }, { status: 400 })

  // Confirm the lesson belongs to this tutor before touching it.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, tutor_id')
    .eq('id', lessonId)
    .eq('tutor_id', user.id)
    .single()
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  if (action === 'builtin') {
    await supabase.from('lessons').update({ zoom_link: null }).eq('id', lessonId).eq('tutor_id', user.id)
    return NextResponse.json({ ok: true, provider: 'builtin', url: null })
  }

  if (action === 'zoom') {
    const url = await createZoomMeeting({
      topic: body.topic || 'Tutafy lesson',
      startTime: body.startTime || new Date().toISOString(),
      duration: body.duration || 60,
    })
    if (!url) return NextResponse.json({ error: 'Zoom is not configured or the request failed' }, { status: 503 })
    await supabase.from('lessons').update({ zoom_link: url }).eq('id', lessonId).eq('tutor_id', user.id)
    return NextResponse.json({ ok: true, provider: 'zoom', url })
  }

  if (action === 'custom') {
    const url = (body.url ?? '').trim()
    if (!isValidMeetingUrl(url)) return NextResponse.json({ error: 'Please enter a valid https link' }, { status: 400 })
    await supabase.from('lessons').update({ zoom_link: url }).eq('id', lessonId).eq('tutor_id', user.id)
    return NextResponse.json({ ok: true, provider: 'custom', url })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
