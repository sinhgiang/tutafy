import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push'

// GET /api/messages?student_id=X  — tutor fetches conversation
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('student_id')
  if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, sender_type, content, created_at, read_at')
    .eq('tutor_id', user.id)
    .eq('student_id', studentId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark student messages as read
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('tutor_id', user.id)
    .eq('student_id', studentId)
    .eq('sender_type', 'student')
    .is('read_at', null)

  return NextResponse.json({ messages })
}

// POST /api/messages  — tutor sends message
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id, content } = await req.json()
  if (!student_id || !content?.trim()) {
    return NextResponse.json({ error: 'student_id and content required' }, { status: 400 })
  }

  // Verify student belongs to tutor
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', student_id)
    .eq('tutor_id', user.id)
    .single()

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ tutor_id: user.id, student_id, sender_type: 'tutor', content: content.trim() })
    .select('id, sender_type, content, created_at, read_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Push notification to student
  const admin = createAdminClient()
  const { data: studentFull } = await admin
    .from('students')
    .select('name, portal_token, push_subscription')
    .eq('id', student_id)
    .single()
  if ((studentFull as any)?.push_subscription) {
    const { data: tutorFull } = await admin.from('tutors').select('name').eq('user_id', user.id).single()
    await sendPushNotification((studentFull as any).push_subscription, {
      title: `New message from ${tutorFull?.name ?? 'your tutor'}`,
      body: content.trim().slice(0, 100),
      url: `/portal/${(studentFull as any)?.portal_token ?? ''}`,
    })
  }

  return NextResponse.json({ message })
}
