import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

// Public API keys look like `tk_<43 base64url chars>`. We store only a SHA-256
// hash of the full key (never the key itself) plus a short prefix for display.
const KEY_PREFIX = 'tk_'

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = KEY_PREFIX + crypto.randomBytes(32).toString('base64url')
  return { key, prefix: key.slice(0, 12), hash: hashKey(key) }
}

export function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex')
}

// Pull the bearer token from an incoming request (Authorization: Bearer tk_...,
// or an ?api_key= query param as a convenience for testing).
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get('authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (m) return m[1].trim()
  const url = new URL(request.url)
  return url.searchParams.get('api_key')
}

export interface ApiCaller { tutorId: string; keyId: string }

// Resolve a request's API key to the owning tutor, or null if invalid. Also
// stamps last_used_at (fire-and-forget) so tutors can see key activity.
export async function authenticateApiKey(request: Request): Promise<ApiCaller | null> {
  const key = extractApiKey(request)
  if (!key || !key.startsWith(KEY_PREFIX)) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('api_keys')
    .select('id, tutor_id')
    .eq('key_hash', hashKey(key))
    .maybeSingle()
  if (!data) return null
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {}, () => {})
  return { tutorId: data.tutor_id, keyId: data.id }
}
