// The ONE function that reads the database for a view (T-0708). Both the server's read-only client (src/lib/supabase/view-client.ts) and the
// route the browser pages use while a view is open (src/app/api/admin/view-rest/[...path]/route.ts) go through it, so the rules of
// src/lib/view-as.ts hold the same everywhere: reads only, only the listed tables, only the viewed tutor's rows, secrets scrubbed.
import { forwardedHeaders, restRequest, scrub } from '@/lib/view-as'

export type ViewFetch = (url: string, init: { method: string; headers: Record<string, string>; cache: 'no-store' }) => Promise<Response>

const refusal = (status: number, code: string) => Response.json({ code, message: 'This is a read-only view of a tutor: nothing can be changed here.', details: null, hint: null }, { status })

export async function performViewRest(o: {
  fetchImpl: ViewFetch
  baseUrl: string
  serviceKey: string
  method: string
  pathname: string
  search: string
  headers: { get(name: string): string | null }
  tutorId: string
}): Promise<Response> {
  const d = restRequest(o.method, o.pathname, o.search, o.tutorId)
  if (!d.ok) return refusal(d.status, d.code)

  const res = await o.fetchImpl(`${o.baseUrl.replace(/\/+$/, '')}${o.pathname}${d.search}`, {
    method: o.method.toUpperCase() === 'HEAD' ? 'HEAD' : 'GET',
    headers: { ...forwardedHeaders(o.headers), apikey: o.serviceKey, Authorization: `Bearer ${o.serviceKey}` },
    cache: 'no-store',
  })

  // Pass the answer on with the same status and the headers a client reads (the count is in content-range), scrubbed.
  const headers = new Headers()
  for (const name of ['content-type', 'content-range']) { const v = res.headers.get(name); if (v) headers.set(name, v) }
  if (o.method.toUpperCase() === 'HEAD') return new Response(null, { status: res.status, headers })
  const text = await res.text()
  // Only JSON is passed on, and only after the scrub: anything else is refused, never handed over as it is.
  if (!(res.headers.get('content-type') ?? '').includes('json')) return refusal(502, 'VIEW_BAD_ANSWER')
  let body: string
  try { body = JSON.stringify(scrub(JSON.parse(text), d.table)) } catch { return refusal(502, 'VIEW_BAD_ANSWER') }
  return new Response(body, { status: res.status, headers })
}
