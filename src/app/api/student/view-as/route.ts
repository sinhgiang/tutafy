import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { signStudentToken } from '@/lib/student-auth'
import { isStudentOfAnotherTutor, verifiedEmail } from '@/lib/role-switch'

export const runtime = 'nodejs'

// "View as student" (T-0676): takes a signed-in tutor to the student side for THEIR OWN email.
//
// - Who: the account of the session cookie, read here on the server. Nothing in the request chooses an email
//   or an account, so nobody can use this to open someone else's lessons.
// - Only when that email is proven theirs (verifiedEmail) and is an active student of another tutor.
//   Otherwise nothing is made and the person lands on the ordinary student sign-in page.
// - It never creates a tutor or a student, and never changes anything: it only redirects.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const go = (path: string) => NextResponse.redirect(`${origin}${path}`, { headers: { 'Cache-Control': 'no-store' } })

  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return go('/login')

  const email = verifiedEmail(user)
  if (!email || !(await isStudentOfAnotherTutor(createAdminClient(), email, user.id))) return go('/student/login')

  try {
    return go(`/student/dashboard?token=${signStudentToken(email)}`)
  } catch {
    // no signing key on the server: nobody gets a link (the reason is in the server log)
    return go('/student/login?error=unavailable')
  }
}
