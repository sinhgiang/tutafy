// The rules of the read-only "View as this tutor" (T-0708), as plain functions with no imports, so the node tests run the very code the
// server runs. Three things are decided here and nowhere else:
//
//   1. proxyDecision: while a view is open, which requests of the whole app may go on. Every request that is not a plain read is refused
//      (the one exception is the Exit button), and of the API only two read-only routes are open.
//   2. restRequest: which reads of the database a view may make. Only GET and HEAD, only the tables listed in OWNER_COLUMN, and every read
//      is narrowed to the viewed tutor's own rows whatever the page asked for.
//   3. scrub: what never leaves the database in a view: any field that looks like a password, key, token, hash or card number, and every
//      tutor column that is not on the short list of columns a dashboard needs (a column nobody has listed is hidden, not shown).
//
// The view never logs in as the tutor and never uses their credentials: the server reads their rows with its own key, narrowed as above.

/** httpOnly cookie that holds the id of the open view (a row of public.admin_view_log). The server checks it against the log every time. */
export const VIEW_COOKIE = 'tutafy_view_as'
/** A cookie the browser code may read. It only says "a view may be open" so the browser client reads through the server; it is never trusted. */
export const VIEW_FLAG_COOKIE = 'tutafy_view_flag'
export const VIEW_TTL_MS = 30 * 60 * 1000

export const VIEW_START_PATH = '/api/admin/view'
export const VIEW_EXIT_PATH = '/api/admin/view/exit'
/** The browser client of a dashboard page reads the database through this address while a view is open. */
export const VIEW_REST_PREFIX = '/api/admin/view-rest'

const READ_METHODS = ['GET', 'HEAD']
export const isReadMethod = (method: string | null | undefined): boolean => READ_METHODS.includes((method ?? 'GET').toUpperCase())

/** The only API routes that answer while a view is open (both only read; the sidebar badges and the bell use them). */
export const VIEW_API_READ_PATHS = ['/api/nav-counts', '/api/notifications']

/**
 * Whether a request may go on while a VALID view is open. A write of any kind (POST, PUT, PATCH, DELETE, a server action) is refused
 * everywhere, so no email is sent, no payment started, no plan changed and nothing saved; the one exception is the Exit button.
 */
export function proxyDecision(method: string, pathname: string): 'allow' | 'deny' {
  if (method.toUpperCase() === 'POST' && pathname === VIEW_EXIT_PATH) return 'allow'
  if (!isReadMethod(method)) return 'deny'
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    if (VIEW_API_READ_PATHS.includes(pathname)) return 'allow'
    if (pathname === VIEW_REST_PREFIX || pathname.startsWith(`${VIEW_REST_PREFIX}/`)) return 'allow'
    return 'deny'
  }
  return 'allow'
}

// ---- which rows a view may read ----------------------------------------------------------------------------------------------

/**
 * Tables a view may read, each with the column that names its owner. A read of one of these always gets `owner = the viewed tutor`
 * added to it. A table that is not here (api_keys, webhook_subscriptions, push_subscriptions, lesson_card_payments, homework_submissions
 * and lesson_students, which have no owner column of their own, ...) cannot be read in a view at all.
 */
export const OWNER_COLUMN: Record<string, string> = {
  tutors: 'id',
  students: 'tutor_id',
  lessons: 'tutor_id',
  availability: 'tutor_id',
  availability_exceptions: 'tutor_id',
  blocked_times: 'tutor_id',
  messages: 'tutor_id',
  packages: 'tutor_id',
  invoices: 'tutor_id',
  reviews: 'tutor_id',
  waitlist: 'tutor_id',
  coupons: 'tutor_id',
  subscription_plans: 'tutor_id',
  student_subscriptions: 'tutor_id',
  subscriptions: 'tutor_id',
  flashcard_sets: 'tutor_id',
  team_members: 'owner_id',
}

export type RestDecision =
  | { ok: true; table: string; search: string }
  | { ok: false; status: 403 | 404 | 405; code: 'VIEW_READ_ONLY' | 'VIEW_TABLE_DENIED' | 'VIEW_PATH_DENIED' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

/**
 * `pathname` is the address of the database request ("/rest/v1/students"), `search` its query string. The answer is the table and the
 * query string to use, with the owner filter added; or a refusal. The filter is ADDED to the page's own (all filters of a request must
 * hold), so a page that forgot to filter by tutor, or asked for somebody else's id, still gets only the viewed tutor's rows.
 */
export function restRequest(method: string, pathname: string, search: string, tutorId: string): RestDecision {
  if (!isReadMethod(method)) return { ok: false, status: 405, code: 'VIEW_READ_ONLY' }
  const m = /^\/rest\/v1\/([a-z_]+)\/?$/.exec(pathname)
  if (!m) return { ok: false, status: 404, code: 'VIEW_PATH_DENIED' } // rpc, storage, auth and anything else
  const table = m[1]
  const owner = Object.hasOwn(OWNER_COLUMN, table) ? OWNER_COLUMN[table] : undefined
  if (!owner || !isUuid(tutorId)) return { ok: false, status: 403, code: 'VIEW_TABLE_DENIED' }
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  params.append(owner, `eq.${tutorId}`)
  return { ok: true, table, search: `?${params.toString()}` }
}

const JSON_TYPES = ['application/json', 'application/vnd.pgrst.object+json', '*/*']

/** The request headers a view passes on to the database: what a read needs and nothing the caller could use to change behaviour. */
export function forwardedHeaders(h: { get(name: string): string | null }): Record<string, string> {
  const out: Record<string, string> = {}
  // JSON only: a csv or any other format would skip the scrub
  const accept = h.get('accept'); if (accept && accept.split(',').every(t => JSON_TYPES.includes(t.split(';')[0].trim().toLowerCase()))) out.Accept = accept
  const range = h.get('range'); if (range && /^\d{1,9}-\d{0,9}$/.test(range)) out.Range = range
  const unit = h.get('range-unit'); if (unit === 'items') out['Range-Unit'] = unit
  const prefer = h.get('prefer'); if (prefer && /^count=(exact|planned|estimated)$/.test(prefer)) out.Prefer = prefer
  return out
}

// ---- what never leaves the database in a view -----------------------------------------------------------------------------------

/** Tutor columns a dashboard shows. Any other column of `tutors` (the Stripe account, Polar ids, Google calendar tokens, push keys...) is hidden. */
export const TUTOR_SAFE_COLUMNS = [
  'id', 'email', 'name', 'slug', 'bio', 'avatar_url', 'languages', 'timezone', 'stripe_onboarding_complete', 'booking_url_active',
  'cancellation_hours', 'created_at', 'updated_at', 'buffer_minutes', 'paypal_link', 'paddle_checkout_link', 'payment_link',
  'default_lesson_price', 'subscription_status', 'subscription_expires_at', 'notify_new_booking', 'notify_new_message', 'referral_code',
  'referral_credits', 'custom_domain', 'contract_template', 'average_rating', 'review_count', 'currency', 'lesson_durations',
  'default_lesson_duration', 'hide_branding', 'trial_enabled', 'trial_price', 'intro_video_url', 'levels_taught',
] as const

/** A field name that looks like a secret is dropped wherever it is, in any table and in any embedded row. */
export const SECRET_FIELD = /(token|secret|passw|api_?key|private|hash|cvc|card_?number|iban|refresh|credential)/i

/** `table` is the table the value came from (or the name an embedded row has); `tutors` rows are cut down to TUTOR_SAFE_COLUMNS. */
export function scrub(value: unknown, table = ''): unknown {
  if (Array.isArray(value)) return value.map(v => scrub(v, table))
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (table === 'tutors' && !(TUTOR_SAFE_COLUMNS as readonly string[]).includes(k)) continue
    if (SECRET_FIELD.test(k)) continue
    out[k] = scrub(v, k)
  }
  return out
}

/** The user a page sees in a view: the viewed tutor, with nothing but who they are. Never a session, a token or a password. */
export function viewUser(tutor: { id: string; email: string }) {
  return { id: tutor.id, email: tutor.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() }
}
