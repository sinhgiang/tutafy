import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createZoomMeeting } from '@/lib/zoom'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, topic, startTime, duration } = await req.json()
  const zoomUrl = await createZoomMeeting({ topic, startTime, duration })
  if (!zoomUrl) return NextResponse.json({ error: 'Zoom not configured or failed' }, { status: 503 })

  await supabase.from('lessons').update({ zoom_link: zoomUrl }).eq('id', lessonId).eq('tutor_id', user.id)
  return NextResponse.json({ url: zoomUrl })
}
