// A small stand-in for Supabase (auth + REST) with FAKE data, so the signed-in pages of
// Tutafy can be opened and measured on this machine without a real database or login.
// For checking layout only. Nothing here is real: every name and address is made up
// (example.com), and nothing is written anywhere but memory.
//
//   node scripts/mock-supabase.mjs            # listens on http://localhost:54399
//   MOCK_PORT=54400 node scripts/mock-supabase.mjs
//
// Then run the app against it (values given on the command line, never written to a file):
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon \
//   SUPABASE_SERVICE_ROLE_KEY=mock-service npx next dev -p 3131
// and give the browser a session with GET http://localhost:54399/__session?as=tutor (or as=admin),
// which answers the JSON for the cookie `sb-localhost-auth-token` (see docs/feature-map.md).
//
// It speaks the part of PostgREST the app uses: select (with embedded many-to-one and
// one-to-many tables, and `rel(count)`), eq / neq / gt / gte / lt / lte / in / is / like /
// ilike / not / or filters, order, limit, range, single / maybeSingle, count (exact, head),
// insert / update / upsert / delete, and rpc (answers empty).
import http from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const PORT = Number(process.env.MOCK_PORT ?? 54399)
const HERE = path.dirname(fileURLToPath(import.meta.url))
// The admin account is the one src/lib/admin.ts names; read it from there, never type it here.
const ADMIN_EMAIL = /ADMIN_EMAIL = '([^']+)'/.exec(readFileSync(path.join(HERE, '../src/lib/admin.ts'), 'utf8'))?.[1] ?? 'admin@example.com'

const TUTOR_ID = '00000000-0000-4000-8000-000000000001'
const ADMIN_ID = '00000000-0000-4000-8000-0000000000ad'
const id = (n, kind = 'a') => `00000000-0000-4000-${kind}000-${String(n).padStart(12, '0')}`
const iso = (daysFromNow, hour = 10) => {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + daysFromNow); d.setUTCHours(hour, 0, 0, 0); return d.toISOString()
}

// ---------- fake data ----------
const NAMES = ['Maria Santos', 'Liam Johnson', 'Yuki Tanaka', 'Anna Schmidt', 'Pedro Alvarez', 'Chen Wei', 'Sofia Rossi', 'Omar Haddad']
const tutors = [
  {
    id: TUTOR_ID, email: 'tutor@example.com', name: 'Sarah Test', slug: 'sarah-test', bio: 'Friendly English and Spanish tutor with ten years of experience helping adults speak with confidence.',
    avatar_url: null, languages: ['English', 'Spanish'], timezone: 'America/New_York', stripe_account_id: null, stripe_onboarding_complete: false,
    booking_url_active: true, cancellation_hours: 24, subscription_status: 'pro', subscription_expires_at: iso(25), default_lesson_price: 40, currency: 'USD',
    paypal_link: null, payment_link: null, trial_enabled: true, trial_price: 15, buffer_minutes: 10, average_rating: 4.8, review_count: 12,
    referral_code: 'SARAH10', referral_credits: 0, custom_domain: null, created_at: iso(-90), updated_at: iso(-1),
  },
  { id: ADMIN_ID, email: ADMIN_EMAIL, name: 'Platform Admin', slug: 'platform-admin', subscription_status: 'academy', created_at: iso(-200), languages: [], timezone: 'UTC' },
  { id: id(2, 'b'), email: 'tutor2@example.com', name: 'Diego Prueba', slug: 'diego-prueba', subscription_status: 'free', languages: ['Spanish'], timezone: 'Europe/Madrid', created_at: iso(-30), average_rating: 4.5, review_count: 3, booking_url_active: true, default_lesson_price: 25, currency: 'EUR' },
  { id: id(3, 'b'), email: 'tutor3@example.com', name: 'Mai Thử', slug: 'mai-thu', subscription_status: 'pro', languages: ['Vietnamese', 'English'], timezone: 'Asia/Ho_Chi_Minh', created_at: iso(-12), average_rating: 5, review_count: 1, booking_url_active: true, default_lesson_price: 500000, currency: 'VND' },
]
const students = NAMES.map((name, i) => ({
  id: id(i + 1), tutor_id: TUTOR_ID, name, email: `student${i + 1}@example.com`, phone: null, country: ['Brazil', 'UK', 'Japan', 'Germany', 'Spain', 'China', 'Italy', 'Egypt'][i],
  timezone: 'UTC', level: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'B1', 'A2'][i], goals: 'Improve speaking for work meetings and travel.', native_language: 'Other',
  notes: 'Prefers evening lessons.', tags: ['business', 'speaking'], status: i === 7 ? 'paused' : 'active', avatar_url: null, portal_token: id(i + 1, 'c'), parent_email: null, created_at: iso(-60 + i), updated_at: iso(-2),
}))
const lessons = []
for (let i = 0; i < 24; i++) {
  const past = i < 14
  lessons.push({
    id: id(i + 1, 'd'), tutor_id: TUTOR_ID, student_id: students[i % students.length].id, starts_at: iso(past ? -(i + 1) * 2 : (i - 13) * 2, 9 + (i % 8)), ends_at: iso(past ? -(i + 1) * 2 : (i - 13) * 2, 10 + (i % 8)),
    duration_minutes: 60, status: past ? (i % 7 === 0 ? 'cancelled' : 'completed') : 'scheduled', zoom_link: null, meet_link: 'https://meet.example.com/abc', notes: past ? 'Reviewed past tense and practised role play.' : null,
    homework: past ? 'Write six sentences using the present perfect.' : null, vocabulary: past ? [{ word: 'deadline', meaning: 'a time limit' }] : [], recording_url: null, price: 40, currency: 'USD',
    payment_status: past ? (i % 3 === 0 ? 'pending' : 'paid') : 'pending', assigned_to: null, created_at: iso(-30), updated_at: iso(-1),
  })
}
const messages = students.slice(0, 5).flatMap((s, i) => [
  { id: id(i * 2 + 1, 'e'), tutor_id: TUTOR_ID, student_id: s.id, sender_type: 'student', content: 'Hi Sarah, can we move our next lesson to Thursday evening? Thank you!', created_at: iso(-i - 1, 8), read_at: i < 2 ? null : iso(-i, 8) },
  { id: id(i * 2 + 2, 'e'), tutor_id: TUTOR_ID, student_id: s.id, sender_type: 'tutor', content: 'Of course, Thursday at 6 pm works for me.', created_at: iso(-i - 1, 9), read_at: iso(-i - 1, 10) },
])
const availability = [1, 2, 3, 4, 5].map(d => ({ id: id(d, 'f'), tutor_id: TUTOR_ID, day_of_week: d, start_time: '09:00:00', end_time: '17:00:00', created_at: iso(-30) }))
const packages = [
  { id: id(1, '1'), tutor_id: TUTOR_ID, name: '10 lesson pack', description: 'Ten one-hour lessons, use within six months.', lessons_count: 10, price: 360, currency: 'USD', active: true, created_at: iso(-20) },
  { id: id(2, '1'), tutor_id: TUTOR_ID, name: '5 lesson pack', description: 'Five lessons to get started.', lessons_count: 5, price: 190, currency: 'USD', active: true, created_at: iso(-20) },
]
const coupons = [{ id: id(1, '2'), tutor_id: TUTOR_ID, code: 'WELCOME20', discount_type: 'percent', discount_value: 20, max_uses: 50, uses: 3, active: true, expires_at: null, created_at: iso(-10) }]
const reviews = students.slice(0, 3).map((s, i) => ({ id: id(i + 1, '3'), tutor_id: TUTOR_ID, student_id: s.id, rating: 5 - (i % 2), comment: 'Patient, clear and always well prepared.', created_at: iso(-5 - i), students: undefined }))
const invoices = students.slice(0, 4).map((s, i) => ({ id: id(i + 1, '4'), tutor_id: TUTOR_ID, student_id: s.id, lesson_id: lessons[i].id, amount: 40 + i * 5, currency: 'USD', status: ['paid', 'sent', 'overdue', 'draft'][i], due_date: iso(i - 2).slice(0, 10), created_at: iso(-10) }))
const homework_submissions = students.slice(0, 3).map((s, i) => ({ id: id(i + 1, '5'), lesson_id: lessons[i].id, student_id: s.id, content: 'I have worked here for three years. She has lived in Spain since 2019.', ai_feedback: null, tutor_feedback: null, feedback_at: null, submitted_at: iso(-i - 1) }))
const team_members = [
  { id: id(1, '6'), owner_id: TUTOR_ID, tutor_id: TUTOR_ID, name: 'Lena Team', email: 'lena@example.com', slug: 'lena-team', role: 'tutor', pay_type: 'per_lesson', pay_rate: 20, active: true, created_at: iso(-15) },
]
const visitors = Array.from({ length: 12 }, (_, i) => ({ id: id(i + 1, '7'), visitor_id: `v${i}`, first_seen: iso(-i), first_source: ['Direct', 'Google Search', 'Facebook'][i % 3], country: ['US', 'GB', 'VN'][i % 3], created_at: iso(-i) }))
const visitor_events = visitors.slice(0, 8).map((v, i) => ({ id: id(i + 1, '8'), visitor_id: v.id, path: ['/', '/blog', '/register', '/upgrade'][i % 4], event: 'page_view', created_at: iso(-i) }))
const subscription_plans = [
  { id: id(1, '9'), tutor_id: TUTOR_ID, name: 'Monthly 4 lessons', amount: 140, currency: 'USD', interval: 'monthly', lessons_per_period: 4, active: true, created_at: iso(-20) },
]
const student_subscriptions = [{ id: id(1, '9'), student_id: students[0].id, plan_id: subscription_plans[0].id, status: 'active', created_at: iso(-10) }]
const waitlist = [{ id: id(1, 'a'), tutor_id: TUTOR_ID, name: 'Wait Lister', email: 'wait@example.com', note: 'Weekday evenings please', created_at: iso(-2) }]
const referrals = []
const api_keys = [{ id: id(1, 'b'), tutor_id: TUTOR_ID, name: 'Zapier', key_prefix: 'tfy_ab12', created_at: iso(-4), last_used_at: null }]
const webhook_subscriptions = []
const lesson_card_payments = []
const availability_exceptions = []
const lesson_students = []

const DB = { tutors, students, lessons, messages, availability, packages, coupons, reviews, invoices, homework_submissions, team_members, visitors, visitor_events,
  subscription_plans, student_subscriptions, waitlist, referrals, api_keys, webhook_subscriptions, lesson_card_payments, availability_exceptions, lesson_students }

// ---------- query engine ----------
const singular = t => t.replace(/ies$/, 'y').replace(/s$/, '')
const columnsIn = s => {
  // split "a, b, rel(x, y), c" at top-level commas
  const out = []; let depth = 0; let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
function project(table, row, select) {
  const parts = select && select !== '*' ? columnsIn(select) : ['*']
  const out = {}
  for (const part of parts) {
    const m = /^(?:(\w+):)?(\w+)(?:!\w+)?\((.*)\)$/.exec(part)
    if (m) {
      const alias = m[1] ?? m[2]; const rel = m[2]; const inner = m[3]
      const relRows = DB[rel] ?? []
      if (row[`${singular(rel)}_id`] !== undefined || (row[`${rel}_id`] !== undefined)) {
        const fk = row[`${singular(rel)}_id`] ?? row[`${rel}_id`]
        const target = relRows.find(r => r.id === fk)
        out[alias] = target ? project(rel, target, inner) : null
      } else {
        const fkName = `${singular(table)}_id`
        const children = relRows.filter(r => r[fkName] === row.id || (table === 'tutors' && r.tutor_id === row.id))
        out[alias] = inner.trim() === 'count' ? [{ count: children.length }] : children.map(c => project(rel, c, inner))
      }
    } else if (part === '*') Object.assign(out, row)
    else { const key = part.split(':').pop(); out[part.includes(':') ? part.split(':')[0] : key] = row[key] ?? null }
  }
  return out
}
const parseVal = v => (v === 'null' ? null : v === 'true' ? true : v === 'false' ? false : v)
const cmp = (a, b) => {
  if (a == null || b == null) return false
  const na = Number(a), nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && !/[-T:]/.test(String(a))) return [na, nb]
  return [String(a), String(b)]
}
function test(row, col, op, val) {
  let v = row[col]
  if (Array.isArray(v)) v = JSON.stringify(v)
  switch (op) {
    case 'eq': return String(v) === val || (v === null && val === 'null')
    case 'neq': return String(v) !== val
    case 'is': return parseVal(val) === null ? v == null : v === parseVal(val)
    case 'in': return val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(v))
    case 'like': case 'ilike': return new RegExp('^' + val.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', op === 'ilike' ? 'i' : '').test(String(v ?? ''))
    case 'gt': case 'gte': case 'lt': case 'lte': {
      const c = cmp(v, val); if (!c) return false
      return op === 'gt' ? c[0] > c[1] : op === 'gte' ? c[0] >= c[1] : op === 'lt' ? c[0] < c[1] : c[0] <= c[1]
    }
    case 'cs': case 'contains': return String(v ?? '').includes(val.replace(/[{}"]/g, ''))
    default: return true
  }
}
function matchRow(row, params) {
  for (const [k, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue
    if (k === 'or') {
      const alts = columnsIn(raw.replace(/^\(|\)$/g, ''))
      if (!alts.some(a => { const m = /^(\w+)\.(\w+)\.(.*)$/.exec(a); return m ? test(row, m[1], m[2], m[3]) : true })) return false
      continue
    }
    const m = /^(not\.)?(\w+)\.(.*)$/.exec(raw)
    if (!m) continue
    const ok = test(row, k, m[2], m[3])
    if (m[1] ? ok : !ok) return false
  }
  return true
}

// ---------- auth ----------
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
function sessionFor(who) {
  const user = who === 'admin'
    ? { id: ADMIN_ID, email: ADMIN_EMAIL }
    : { id: TUTOR_ID, email: 'tutor@example.com' }
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.mocksignature`
  const fullUser = { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, app_metadata: { provider: 'email' }, user_metadata: { full_name: user.email === 'tutor@example.com' ? 'Sarah Test' : 'Platform Admin' }, created_at: iso(-90) }
  return { access_token: jwt, token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: `mock-refresh-${who}`, user: fullUser }
}
const userFromAuth = req => {
  const tok = (req.headers.authorization ?? '').replace(/^Bearer /, '')
  try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()); return sessionFor(p.sub === ADMIN_ID ? 'admin' : 'tutor').user } catch { return null }
}

// ---------- server ----------
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range', ...headers })
  res.end(body === undefined ? '' : JSON.stringify(body))
}
const readBody = req => new Promise(r => { let s = ''; req.on('data', c => { s += c }); req.on('end', () => { try { r(s ? JSON.parse(s) : null) } catch { r(null) } }) })

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (req.method === 'OPTIONS') return send(res, 204)
  const p = url.pathname

  if (p === '/__session') {
    const s = sessionFor(url.searchParams.get('as') === 'admin' ? 'admin' : 'tutor')
    return send(res, 200, { cookieName: 'sb-localhost-auth-token', cookieValue: 'base64-' + b64(s) })
  }
  // Optional: lets a measuring page hand its results back. Only when MOCK_SAVE_DIR is set, only a plain file name, only under that folder.
  if (p.startsWith('/__save/') && process.env.MOCK_SAVE_DIR) {
    const name = p.slice('/__save/'.length)
    if (!/^[\w.-]+$/.test(name)) return send(res, 400, { message: 'bad name' })
    let text = ''; for await (const c of req) text += c
    writeFileSync(path.join(process.env.MOCK_SAVE_DIR, name), text)
    return send(res, 200, { saved: name, bytes: text.length })
  }
  if (p === '/auth/v1/user') {
    const u = userFromAuth(req)
    return u ? send(res, 200, { ...u, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) : send(res, 401, { code: 401, msg: 'no session' })
  }
  if (p === '/auth/v1/token') {
    const who = /admin/.test(String((await readBody(req))?.refresh_token ?? '')) ? 'admin' : 'tutor'
    return send(res, 200, sessionFor(who))
  }
  if (p.startsWith('/auth/v1/')) return send(res, 200, {})
  if (p.startsWith('/storage/') || p.startsWith('/functions/') || p.startsWith('/realtime/')) return send(res, 200, {})

  const rpc = /^\/rest\/v1\/rpc\/(\w+)/.exec(p)
  if (rpc) { await readBody(req); return send(res, 200, []) }

  const t = /^\/rest\/v1\/(\w+)/.exec(p)?.[1]
  if (!t) return send(res, 404, { message: 'not found' })
  const table = DB[t] ?? (DB[t] = [])
  const params = [...url.searchParams.entries()]
  const prefer = String(req.headers.prefer ?? '')
  const wantsOne = /vnd\.pgrst\.object/.test(String(req.headers.accept ?? ''))
  const select = url.searchParams.get('select') ?? '*'

  if (req.method === 'GET' || req.method === 'HEAD') {
    let rows = table.filter(r => matchRow(r, params))
    const total = rows.length
    const order = url.searchParams.get('order')
    if (order) {
      const keys = order.split(',').map(s => { const [c, ...f] = s.split('.'); return { c, desc: f.includes('desc') } })
      rows = [...rows].sort((a, b) => { for (const k of keys) { const x = a[k.c], y = b[k.c]; if (x === y) continue; return ((x ?? '') > (y ?? '') ? 1 : -1) * (k.desc ? -1 : 1) } return 0 })
    }
    const off = Number(url.searchParams.get('offset') ?? 0)
    const lim = url.searchParams.get('limit')
    rows = rows.slice(off, lim ? off + Number(lim) : undefined)
    const range = req.headers.range
    const headers = { 'content-range': `${rows.length ? `${off}-${off + rows.length - 1}` : '*'}/${/count=/.test(prefer) ? total : '*'}` }
    if (req.method === 'HEAD') return send(res, 200, undefined, headers)
    const out = rows.map(r => project(t, r, select))
    void range
    if (wantsOne) {
      return out.length === 1 ? send(res, 200, out[0], headers) : send(res, 406, { code: 'PGRST116', details: `The result contains ${out.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' }, headers)
    }
    return send(res, 200, out, headers)
  }

  const body = await readBody(req)
  if (req.method === 'POST') {
    const list = (Array.isArray(body) ? body : [body ?? {}]).map(r => ({ id: r.id ?? `00000000-0000-4000-9000-${String(Date.now() % 1e12).padStart(12, '0')}`, ...r }))
    if (/resolution=merge/.test(prefer)) {
      const key = url.searchParams.get('on_conflict') ?? 'id'
      for (const r of list) { const f = table.find(x => x[key] === r[key]); if (f) Object.assign(f, r); else table.push(r) }
    } else table.push(...list)
    const out = list.map(r => project(t, r, select))
    return /return=representation/.test(prefer) ? send(res, 201, wantsOne ? out[0] : out) : send(res, 201, undefined)
  }
  if (req.method === 'PATCH') {
    const rows = table.filter(r => matchRow(r, params)); rows.forEach(r => Object.assign(r, body))
    const out = rows.map(r => project(t, r, select))
    return /return=representation/.test(prefer) ? send(res, 200, wantsOne ? out[0] : out) : send(res, 204)
  }
  if (req.method === 'DELETE') {
    for (let i = table.length - 1; i >= 0; i--) if (matchRow(table[i], params)) table.splice(i, 1)
    return send(res, 204)
  }
  send(res, 405, { message: 'method not allowed' })
}).listen(PORT, '127.0.0.1', () => console.log(`mock supabase (FAKE data) on http://localhost:${PORT} (this machine only)`))
