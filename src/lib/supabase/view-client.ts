// The database client every server page and route gets while a "View as this tutor" is open (T-0708). It is made with the server's own
// key, never the tutor's login, and it can only READ: every request goes through src/lib/view-rest.ts, which refuses writes, refuses
// every table that is not listed, narrows every read to the viewed tutor's rows and scrubs secrets from the answer.
//
// To the page it looks like a signed-in client: `auth.getUser()` answers with the viewed tutor (only who they are), so the dashboard
// pages run unchanged, with the tutor's id in every filter.
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { performViewRest, type ViewFetch } from '@/lib/view-rest'
import { viewUser } from '@/lib/view-as'

export function createViewClient(tutor: { id: string; email: string }, cfg: { url: string; serviceKey: string; fetchImpl?: ViewFetch }) {
  const real = (cfg.fetchImpl ?? fetch) as ViewFetch
  const viewFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : null
    const url = new URL(request ? request.url : String(input))
    return performViewRest({
      fetchImpl: real,
      baseUrl: cfg.url,
      serviceKey: cfg.serviceKey,
      method: init?.method ?? request?.method ?? 'GET',
      pathname: url.pathname,
      search: url.search,
      headers: new Headers(init?.headers ?? request?.headers),
      tutorId: tutor.id,
    })
  }
  const client = createSupabaseClient(cfg.url, cfg.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: viewFetch as typeof fetch },
  })
  const user = viewUser(tutor)
  // The pages ask who is signed in: it is the viewed tutor. No session, no token.
  client.auth.getUser = (async () => ({ data: { user }, error: null })) as typeof client.auth.getUser
  client.auth.getSession = (async () => ({ data: { session: null }, error: null })) as typeof client.auth.getSession
  return client
}
