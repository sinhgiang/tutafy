import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { unsubscribeSecret, verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Unsubscribes ONE address from Tutafy's tips mail (T-0737). There is only POST: a GET (a mail scanner opening the link) does nothing.
// Two callers:
//   - the button on /unsubscribe: a form post, answered with a redirect back to the page ("You are unsubscribed");
//   - a mail program's own Unsubscribe button (List-Unsubscribe-Post: List-Unsubscribe=One-Click, RFC 8058): the body is
//     "List-Unsubscribe=One-Click", answered with 200.
// Who may do it: whoever holds the signed link of THAT address (src/lib/unsubscribe-token.ts). The address is read out of the
// verified token, never from the body, so a link can only ever unsubscribe the address it was made for. A forged or changed token is
// refused before the database is touched; with no signing key on the server nothing is accepted (503).
export async function POST(request: NextRequest) {
  if (!unsubscribeSecret()) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
  const email = verifyUnsubscribeToken(request.nextUrl.searchParams.get('t') ?? '')
  if (!email) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

  const body = await request.text().catch(() => '')
  const oneClick = /(^|&)List-Unsubscribe=One-Click(&|$)/.test(body.slice(0, 200))

  // Idempotent: unsubscribing twice is the same as once.
  const { error } = await createAdminClient().from('email_optouts').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })

  if (oneClick) return NextResponse.json({ ok: true })
  return NextResponse.redirect(new URL('/unsubscribe?done=1', request.url), 303)
}
