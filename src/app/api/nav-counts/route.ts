import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Lightweight polling endpoint for the sidebar notification badges.
// Returns unread student messages + new lesson bookings created since `since`.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ unreadMessages: 0, newBookings: 0 }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')

  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', user.id)
    .eq('sender_type', 'student')
    .is('read_at', null)

  let newBookings = 0
  if (since) {
    const { count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', user.id)
      .neq('status', 'cancelled')
      .gt('created_at', since)
    newBookings = count ?? 0
  }

  return NextResponse.json({
    unreadMessages: unreadMessages ?? 0,
    newBookings,
  })
}
