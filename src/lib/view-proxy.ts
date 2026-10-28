// The part of the proxy that keeps "View as this tutor" read-only for the WHOLE app (T-0708). While a valid view is open, every request
// that is not a plain read, and every API request except the two read-only ones, is refused here before any page or route runs: a
// server action, a form post, a call to Stripe or to the mail sender never starts. The rules are src/lib/view-as.ts `proxyDecision`.
//
// A view counts as open only after the check `resolveViewer` does (the really signed-in account is the admin, and the cookie names an open,
// unexpired log row of that admin). A cookie that does not pass is just ignored: the request goes on as it would without it.
import { NextResponse, type NextRequest } from 'next/server'
import { VIEW_COOKIE, isReadMethod, proxyDecision } from '@/lib/view-as'

export type Viewer = { valid: boolean }

export async function viewBlock(request: NextRequest, resolveViewer: (sessionId: string) => Promise<Viewer>): Promise<NextResponse | null> {
  const sessionId = request.cookies.get(VIEW_COOKIE)?.value
  if (!sessionId) return null
  const path = request.nextUrl.pathname
  // A plain read of a page needs no check here (the page's own client checks the view itself); anything else does.
  if (isReadMethod(request.method) && !(path === '/api' || path.startsWith('/api/'))) return null
  if (!(await resolveViewer(sessionId)).valid) return null
  if (proxyDecision(request.method, path) === 'allow') return null
  return NextResponse.json({ error: 'read_only_view', message: 'This is a read-only view of a tutor: nothing can be changed here. Press Exit first.' }, { status: 403 })
}
