import { NextResponse, type NextRequest } from 'next/server'
import { adminApiGate } from '@/lib/admin-guard'
import { activeViewTutor } from '@/lib/supabase/server'
import { performViewRest } from '@/lib/view-rest'
import { viewUser } from '@/lib/view-as'

export const dynamic = 'force-dynamic'

/**
 * The way a dashboard page that reads the database from the BROWSER (settings, availability, ...) reads it while the admin has a
 * "View as this tutor" open (T-0708): its client sends every request here instead of to the database. Reads only, the same rules as
 * the server's view client (src/lib/view-rest.ts): the listed tables, the viewed tutor's rows, secrets scrubbed. The answer to "who is
 * signed in" is the viewed tutor, with nothing but who they are. Anything that is not a plain read is refused.
 */
async function handle(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const denied = await adminApiGate()
  if (denied) return denied
  const view = await activeViewTutor()
  if (!view) return NextResponse.json({ code: 'VIEW_NOT_OPEN', message: 'No view is open.' }, { status: 403 })

  const { path } = await ctx.params
  const pathname = `/${(path ?? []).join('/')}`
  if (pathname === '/auth/v1/user' && ['GET', 'HEAD'].includes(request.method)) return NextResponse.json(viewUser(view))

  return performViewRest({
    fetchImpl: fetch,
    baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    method: request.method,
    pathname,
    search: new URL(request.url).search,
    headers: request.headers,
    tutorId: view.id,
  })
}

export const GET = handle
export const HEAD = handle
// Everything else is a write: refused here as well as by the proxy and by performViewRest.
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
