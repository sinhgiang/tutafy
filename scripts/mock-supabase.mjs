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
// and give the browser a session with GET http://localhost:54399/__session?as=tutor (or as=admin, or as=newtutor: a Free tutor who has only a self-added student),
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
const NEW_TUTOR_ID = '00000000-0000-4000-8000-0000000000ee'
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
  // the row that pages list shows a made-up address; only the login session below carries the real one, because the admin gate compares it
  { id: ADMIN_ID, email: 'platform-admin@example.com', name: 'Platform Admin', slug: 'platform-admin', subscription_status: 'academy', created_at: iso(-200), languages: [], timezone: 'UTC' },
  { id: id(2, 'b'), referred_by: TUTOR_ID, email: 'tutor2@example.com', name: 'Diego Prueba', slug: 'diego-prueba', subscription_status: 'free', languages: ['Spanish'], timezone: 'Europe/Madrid', created_at: iso(-30), average_rating: 4.5, review_count: 3, booking_url_active: true, default_lesson_price: 25, currency: 'EUR', lesson_durations: [45, 90], default_lesson_duration: 45 },
  { id: id(3, 'b'), referred_by: TUTOR_ID, email: 'tutor3@example.com', name: 'Mai Thử', slug: 'mai-thu', subscription_status: 'pro', hide_branding: true, languages: ['Vietnamese', 'English'], timezone: 'Asia/Ho_Chi_Minh', created_at: iso(-12), average_rating: 5, review_count: 1, booking_url_active: true, default_lesson_price: 500000, currency: 'VND' },
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
// the booking pages of Diego (Free) and Mai (Pro, "Made with Tutafy" turned off) need open hours to show the booking form
for (const [k, tid] of [[20, id(2, 'b')], [30, id(3, 'b')]]) for (const d of [1, 2, 3, 4, 5]) availability.push({ id: id(k + d, 'f'), tutor_id: tid, day_of_week: d, start_time: '09:00:00', end_time: '17:00:00', created_at: iso(-30) })
const packages = [
  { id: id(1, '1'), tutor_id: TUTOR_ID, name: '10 lesson pack', description: 'Ten one-hour lessons, use within six months.', lessons_count: 10, price: 360, currency: 'USD', active: true, created_at: iso(-20) },
  { id: id(2, '1'), tutor_id: TUTOR_ID, name: '5 lesson pack', description: 'Five lessons to get started.', lessons_count: 5, price: 190, currency: 'USD', active: true, created_at: iso(-20) },
]
const coupons = [{ id: id(1, '2'), tutor_id: TUTOR_ID, code: 'WELCOME20', discount_type: 'percent', discount_value: 20, max_uses: 50, uses_count: 3, active: true, expires_at: null, created_at: iso(-10) }]
const reviews = students.slice(0, 3).map((s, i) => ({ id: id(i + 1, '3'), tutor_id: TUTOR_ID, student_id: s.id, rating: 5 - (i % 2), comment: 'Patient, clear and always well prepared.', is_public: true, created_at: iso(-5 - i), students: undefined }))
const invoices = students.slice(0, 4).map((s, i) => ({ id: id(i + 1, '4'), tutor_id: TUTOR_ID, student_id: s.id, lesson_id: lessons[i].id, amount: 40 + i * 5, currency: 'USD', status: ['paid', 'sent', 'overdue', 'draft'][i], due_date: iso(i - 2).slice(0, 10), created_at: iso(-10) }))
const homework_submissions = students.slice(0, 3).map((s, i) => ({ id: id(i + 1, '5'), lesson_id: lessons[i].id, student_id: s.id, content: 'I have worked here for three years. She has lived in Spain since 2019.', ai_feedback: null, tutor_feedback: null, feedback_at: null, submitted_at: iso(-i - 1) }))
const team_members = [
  { id: id(1, '6'), owner_id: TUTOR_ID, tutor_id: TUTOR_ID, name: 'Lena Team', email: 'lena@example.com', slug: 'lena-team', role: 'tutor', pay_type: 'per_lesson', pay_rate: 20, active: true, created_at: iso(-15) },
]
const visitors = Array.from({ length: 12 }, (_, i) => ({ id: id(i + 1, '7'), visitor_id: `v${i}`, first_seen: iso(-i), first_source: ['Direct', 'Google Search', 'Facebook'][i % 3], country: ['US', 'GB', 'VN'][i % 3], created_at: iso(-i) }))
const visitor_events = visitors.slice(0, 8).map((v, i) => ({ id: id(i + 1, '8'), visitor_id: v.id, path: ['/', '/blog', '/register', '/upgrade'][i % 4], event: 'page_view', created_at: iso(-i) }))
const subscription_plans = [
  { id: id(1, '9'), tutor_id: TUTOR_ID, name: 'Monthly 4 lessons', price: 140, currency: 'usd', period: 'month', duration_minutes: 60, lessons_per_period: 4, is_active: true, created_at: iso(-20) },
]
const student_subscriptions = [{ id: id(1, '9'), student_id: students[0].id, plan_id: subscription_plans[0].id, status: 'active', created_at: iso(-10) }]
const waitlist = [{ id: id(1, 'a'), tutor_id: TUTOR_ID, name: 'Wait Lister', email: 'wait@example.com', message: 'Weekday evenings please', created_at: iso(-2) }]
const referrals = []
const api_keys = [{ id: id(1, 'b'), tutor_id: TUTOR_ID, name: 'Zapier', key_prefix: 'tfy_ab12', created_at: iso(-4), last_used_at: null }]
const webhook_subscriptions = []
const lesson_card_payments = []
const availability_exceptions = []
const lesson_students = []

// MOCK_OVERVIEW=1 adds a crowd of fake tutors for the admin Overview (sign-ups over 12 weeks, one
// self-added student each, a few real students and lessons). Off by default so other pages keep their small data.
if (process.env.MOCK_OVERVIEW) {
  const perWeek = [3, 6, 2, 9, 5, 12, 8, 4, 7, 3, 10, 5] // sign-ups, oldest week first
  let n = 0
  perWeek.forEach((count, w) => {
    for (let k = 0; k < count; k++, n++) {
      const tid = id(100 + n, 'b')
      const daysAgo = (11 - w) * 7 + (k % 6)
      tutors.push({ id: tid, email: `fake-tutor${n}@example.com`, name: `Fake Tutor ${n}`, slug: `fake-tutor-${n}`, subscription_status: 'free', languages: ['English'], timezone: 'UTC', created_at: iso(-daysAgo), booking_url_active: true })
      students.push({ id: id(100 + n, 'a'), tutor_id: tid, name: `Fake Tutor ${n}`, email: `fake-tutor${n}@example.com`, status: 'active', portal_token: id(100 + n, 'c'), created_at: iso(-daysAgo) })
      if (n % 9 === 0) {
        const real = { id: id(200 + n, 'a'), tutor_id: tid, name: `Real Student ${n}`, email: `real-student${n}@example.com`, status: 'active', portal_token: id(200 + n, 'c'), created_at: iso(-daysAgo) }
        students.push(real)
        lessons.push({ id: id(200 + n, 'd'), tutor_id: tid, student_id: real.id, starts_at: iso(-daysAgo + 1), ends_at: iso(-daysAgo + 1, 11), status: n % 18 === 0 ? 'completed' : 'scheduled', created_at: iso(-daysAgo + 1) })
      }
    }
  })
}

// MOCK_BUYERS=1 gives the paying tutors the Polar subscription ids that scripts/mock-polar.mjs knows, and adds two more buyers (a
// euro Academy plan, and a Pro tutor with no subscription id on record), for the admin Buyers page. Off by default.
if (process.env.MOCK_BUYERS) {
  const set = (tid, sid) => { tutors.find(t => t.id === tid).polar_subscription_id = sid }
  set(TUTOR_ID, 'sub_mock_1'); set(id(3, 'b'), 'sub_mock_2'); set(ADMIN_ID, 'sub_mock_3')
  tutors.push({ id: id(150, 'b'), email: 'hana@example.com', name: 'Hana Ejemplo', slug: 'hana-ejemplo', subscription_status: 'academy', polar_subscription_id: 'sub_mock_4', languages: ['German'], timezone: 'Europe/Berlin', created_at: iso(-45), booking_url_active: true })
  tutors.push({ id: id(151, 'b'), email: 'noor@example.com', name: 'Noor Prueba', slug: 'noor-prueba', subscription_status: 'pro', polar_subscription_id: null, languages: ['Arabic'], timezone: 'Asia/Dubai', created_at: iso(-20), booking_url_active: true })
}

// the Feedback box (supabase/migrations/020_feedback.sql): made-up messages for the admin Feedback page; a POST to /api/feedback adds one in memory
const feedback = [
  { id: id(1, 'e'), created_at: iso(0, 9), author_role: 'tutor', tutor_id: TUTOR_ID, author_email: 'tutor@example.com', kind: 'bug', message: 'The calendar does not load on my phone when I open it from the dashboard.\nIt works again after I refresh the page.' },
  { id: id(2, 'e'), created_at: iso(-1, 16), author_role: 'student', tutor_id: null, author_email: 'student1@example.com', kind: 'question', message: 'Where can I find the homework my tutor sent after the last lesson?' },
  { id: id(3, 'e'), created_at: iso(-2, 11), author_role: 'tutor', tutor_id: id(2, 'b'), author_email: 'tutor2@example.com', kind: 'idea', message: 'Please let me send one reminder to the whole class at once.' },
  { id: id(4, 'e'), created_at: iso(-4, 8), author_role: 'student', tutor_id: null, author_email: 'student2@example.com', kind: 'idea', message: 'A dark mode for the lesson page would help in the evening.' },
]
const DB = { feedback, tutors, students, lessons, messages, availability, packages, coupons, reviews, invoices, homework_submissions, team_members, visitors, visitor_events,
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
    : who === 'newtutor'
      ? { id: NEW_TUTOR_ID, email: 'nina@example.com' }
      : { id: TUTOR_ID, email: 'tutor@example.com' }
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp })}.mocksignature`
  const fullUser = { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, app_metadata: { provider: 'email' }, email_confirmed_at: iso(-90), confirmation_sent_at: iso(-90), user_metadata: { full_name: user.email === 'tutor@example.com' ? 'Sarah Test' : who === 'newtutor' ? 'Nina Nueva' : 'Platform Admin' }, created_at: iso(-90) }
  return { access_token: jwt, token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: `mock-refresh-${who}`, user: fullUser }
}
const userFromAuth = req => {
  const tok = (req.headers.authorization ?? '').replace(/^Bearer /, '')
  try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()); return sessionFor(p.sub === ADMIN_ID ? 'admin' : p.sub === NEW_TUTOR_ID ? 'newtutor' : 'tutor').user } catch { return null }
}

// The sample tutor is also a student of the second tutor (Diego): the "View as student" / "Back to tutor" switch needs both roles (T-0676).
students.push({
  id: id(30), tutor_id: id(2, 'b'), name: 'Sarah Test', email: 'tutor@example.com', phone: null, country: 'US', timezone: 'UTC', level: 'B1', goals: 'Practise Spanish.', native_language: 'English',
  notes: '', tags: [], status: 'active', avatar_url: null, portal_token: id(30, 'c'), parent_email: null, created_at: iso(-20), updated_at: iso(-2),
})
lessons.push(
  { id: id(900, 'd'), tutor_id: id(2, 'b'), student_id: id(30), starts_at: iso(3, 15), ends_at: iso(3, 16), duration_minutes: 60, status: 'scheduled', meet_link: null, zoom_link: null, homework: null, price: 25, payment_status: 'pending', currency: 'EUR', created_at: iso(-5) },
  { id: id(901, 'd'), tutor_id: id(2, 'b'), student_id: id(30), starts_at: iso(-4, 15), ends_at: iso(-4, 16), duration_minutes: 45, status: 'completed', meet_link: null, zoom_link: null, homework: 'Read chapter 3', price: 25, payment_status: 'paid', currency: 'EUR', created_at: iso(-9) },
)

// A brand-new Free tutor (session as=newtutor): nothing done yet, and one "student" under her own address, which must not count.
tutors.push({ id: NEW_TUTOR_ID, email: 'nina@example.com', name: 'Nina Nueva', slug: 'nina-nueva', subscription_status: 'free', languages: ['English'], timezone: 'UTC', created_at: iso(-1), booking_url_active: true, currency: 'USD' })
students.push({ id: id(40), tutor_id: NEW_TUTOR_ID, name: 'Nina Nueva', email: 'nina@example.com', status: 'active', portal_token: id(40, 'c'), created_at: iso(-1) })

// Profile page samples (T-0765): a NEW tutor (Priya: hours and a price, no bio, no photo, no reviews, not Pro) and public reviews for the Free tutor
// Diego, so /tutors/priya-nair and /tutors/diego-prueba show the "new" and the "Free plan" states; /tutors/sarah-test is the full one.
tutors.push({ id: id(4, 'b'), email: 'tutor4@example.com', name: 'Priya Nair', slug: 'priya-nair', subscription_status: 'free', languages: ['English'], timezone: 'Asia/Kolkata', created_at: iso(-10), booking_url_active: true, default_lesson_price: 12, currency: 'USD', cancellation_hours: 0, average_rating: 0, review_count: 0, bio: null, avatar_url: null })
for (const d of [1, 2, 3, 4, 5, 6]) availability.push({ id: id(40 + d, 'f'), tutor_id: id(4, 'b'), day_of_week: d, start_time: '08:00:00', end_time: '12:00:00', created_at: iso(-10) })
Object.assign(tutors.find(t => t.slug === 'diego-prueba'), { bio: 'Spanish for people moving to Spain, and for DELE exam candidates. Clear grammar, lots of speaking.', cancellation_hours: 12, trial_enabled: true, trial_price: 8, review_count: 3, average_rating: 4.7 })
for (const [i, [rating, comment]] of [[5, 'I passed DELE B1 after three months.'], [5, 'Very clear explanations and friendly.'], [4, 'Good lessons. I would like a few more speaking games.']].entries()) reviews.push({ id: id(60 + i, '3'), tutor_id: id(2, 'b'), student_id: id(30), rating, comment, is_public: true, created_at: iso(-6 - i), students: undefined })

// Tutor directory samples (T-0769). MOCK_DIRECTORY=many adds twelve made-up tutors who can be booked (different languages, prices, currencies, trial
// lessons, reviews, time zones and weekly hours, two with no reviews, none with a photo because a photo must be an https address), plus four who must NOT
// be listed (page off, no hours, short introduction, unknown time zone). MOCK_DIRECTORY=empty removes every tutor's hours, so nobody can be booked.
// Unset, the small default data stays: two tutors can be booked (the "few tutors" state).
if (process.env.MOCK_DIRECTORY === 'empty') availability.length = 0
if (process.env.MOCK_DIRECTORY === 'many') {
  const INTRO = 'I help busy people speak with confidence. Every lesson has a plan, real conversation and clear homework you can finish in twenty minutes.'
  const week = (from, to, days = [1, 2, 3, 4, 5]) => days.map(d => ({ d, from, to }))
  const SAMPLES = [
    ['Maya Reyes', ['English', 'Spanish'], 'America/New_York', 22, 'USD', 10, 4.9, 38, 'IELTS and business English coach. I help busy professionals reach band 7+ with a weekly plan and honest feedback.', week('08:00', '21:00', [0, 1, 2, 3, 4, 5, 6])],
    ['Daniel Weiss', ['German', 'English'], 'Europe/Berlin', 28, 'EUR', 8, 4.8, 17, 'German for people moving to Germany, and for Goethe exam candidates. Clear grammar, real situations.', week('09:00', '18:00')],
    ['Priya Nair', ['English', 'Hindi'], 'Asia/Kolkata', 12, 'USD', 5, 0, 0, 'Friendly English conversation practice for beginners and nervous speakers. We start slowly and build up.', week('07:00', '12:00', [1, 2, 3, 4, 5, 6])],
    ['Hana Sato', ['Japanese'], 'Asia/Tokyo', 25, 'USD', 12, 5, 9, 'Japanese from zero to JLPT N3, with real conversations from the first lesson and small weekly goals.', week('18:00', '23:00', [1, 2, 3, 4, 6, 0])],
    ['Lucas Moreau', ['French', 'English'], 'Europe/Paris', 30, 'EUR', 0, 4.7, 21, 'French for travel and work. Clear grammar, relaxed pace, and a lot of speaking from day one of our lessons.', week('10:00', '19:00')],
    ['Sofia Marino', ['Italian', 'English'], 'Europe/Rome', 26, 'USD', 9, 4.9, 14, 'Italian for beginners and for people with Italian family. Lots of speaking, songs and little stories to read.', week('09:00', '17:00', [1, 3, 5, 6])],
    ['Wei Zhang', ['Mandarin'], 'Asia/Shanghai', 20, 'USD', 6, 4.8, 31, 'Mandarin for adults: pronunciation, tones and everyday conversation. I explain the why behind every rule.', week('19:00', '23:00', [0, 1, 2, 3, 4, 5, 6])],
    ['Carlos Mendes', ['Portuguese', 'Spanish'], 'America/Sao_Paulo', 18, 'USD', 5, 0, 0, 'Brazilian Portuguese for expats and for travellers heading to Brazil. Practical phrases, then real chats.', week('13:00', '21:00', [2, 4, 6])],
    ['Emma Clarke', ['English'], 'Europe/London', 35, 'GBP', 0, 4.6, 52, 'Academic English and essay writing for university applications. Detailed written feedback after every lesson.', week('09:00', '17:00')],
    ['Tomás Ruiz', ['Spanish'], 'Europe/Madrid', 24, 'USD', 8, 4.9, 44, 'Spanish for travel, work and DELE exams. Patient and structured, with short exercises between lessons.', week('10:00', '20:00', [1, 2, 3, 4, 5, 6])],
    ['Aisha Rahman', ['English', 'Arabic'], 'Asia/Dubai', 28, 'USD', 7, 5, 11, 'Relaxed English conversation for people who understand more than they can say. No pressure, just practice.', week('16:00', '22:00', [0, 1, 2, 3, 4])],
    ['Alexandra Konstantinopoulou-Papadakis', ['Greek', 'English'], 'Europe/Athens', 40, 'EUR', 0, 4.7, 14, 'Greek for heritage learners and for people moving to Greece, from the alphabet to a first real conversation.', week('09:00', '15:00')],
  ]
  SAMPLES.forEach(([name, languages, timezone, price, currency, trial, rating, reviewCount, bio, hours], i) => {
    const tid = id(300 + i, 'b')
    tutors.push({ id: tid, email: `directory${i}@example.com`, name, slug: name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''), subscription_status: 'free', languages, timezone,
      created_at: iso(-20 - i), booking_url_active: true, default_lesson_price: price, currency, trial_enabled: trial > 0, trial_price: trial || null, average_rating: rating, review_count: reviewCount, bio, avatar_url: null, buffer_minutes: 0 })
    hours.forEach((h, k) => availability.push({ id: id(3000 + i * 10 + k, 'f'), tutor_id: tid, day_of_week: h.d, start_time: `${h.from}:00`, end_time: `${h.to}:00`, created_at: iso(-20) }))
  })
  const unlisted = [
    ['Page Off', { booking_url_active: false }, true], ['No Hours', {}, false], ['Short Intro', { bio: 'Hello there.' }, true], ['Odd Zone', { timezone: 'Mars/Olympus_Mons' }, true],
  ]
  unlisted.forEach(([name, o, hasHours], i) => {
    const tid = id(400 + i, 'b')
    tutors.push({ id: tid, email: `unlisted${i}@example.com`, name, slug: name.toLowerCase().replace(/ /g, '-'), subscription_status: 'free', languages: ['English'], timezone: 'UTC', created_at: iso(-5), booking_url_active: true, default_lesson_price: 20, currency: 'USD', bio: INTRO, ...o })
    if (hasHours) availability.push({ id: id(4000 + i, 'f'), tutor_id: tid, day_of_week: 2, start_time: '09:00:00', end_time: '17:00:00', created_at: iso(-5) })
  })
}

// The seven lessons of the Revenue report (T-0741), with made-up tutors and students: four cancelled lessons marked paid (30 each), one lesson
// past its day and still scheduled (300), two completed lessons (300 each). The admin page /admin/revenue must show 600 as its main number.
{
  const ALPHA = id(50, 'b'), BETA = id(51, 'b')
  tutors.push(
    { id: ALPHA, email: 'alpha@example.com', name: 'Tutor Alpha', slug: 'tutor-alpha', subscription_status: 'free', languages: ['English'], timezone: 'UTC', created_at: iso(-60), booking_url_active: true, currency: 'USD' },
    { id: BETA, email: 'beta@example.com', name: 'Tutor Beta', slug: 'tutor-beta', subscription_status: 'free', languages: ['English'], timezone: 'UTC', created_at: iso(-60), booking_url_active: true, currency: 'USD' },
  )
  const kid = (n, tid, name) => ({ id: id(n), tutor_id: tid, name, email: `kid${n}@example.com`, status: 'active', portal_token: id(n, 'c'), created_at: iso(-60) })
  students.push(kid(60, ALPHA, 'Student One'), kid(61, ALPHA, 'Student Two'), kid(62, BETA, 'Student Beta'))
  const lesson = (n, tid, sid, status, from, price) => ({ id: id(n, 'd'), tutor_id: tid, student_id: sid, starts_at: iso(from, 15), ends_at: iso(from, 16), duration_minutes: 60, status, price, payment_status: 'paid', currency: 'USD', created_at: iso(-60) })
  lessons.push(
    lesson(910, BETA, id(62), 'cancelled', 6, 30), lesson(911, BETA, id(62), 'cancelled', 6, 30), lesson(912, BETA, id(62), 'cancelled', -1, 30), lesson(913, BETA, id(62), 'cancelled', -1, 30),
    lesson(914, ALPHA, id(60), 'scheduled', -43, 300), lesson(915, ALPHA, id(60), 'completed', -45, 300), lesson(916, ALPHA, id(61), 'completed', -46, 300),
  )
  // MOCK_REVENUE_SEVEN=1: make every other sample lesson unpaid, so the Revenue page holds exactly these seven (for a picture of the report's case).
  if (process.env.MOCK_REVENUE_SEVEN === '1') for (const l of lessons) if (!/^00000000-0000-4000-d000-0000000009(1[0-6])$/.test(l.id)) l.payment_status = 'pending'
}

// ---------- server ----------
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range', ...headers })
  res.end(body === undefined ? '' : JSON.stringify(body))
}
const readBody = req => new Promise(r => { let s = ''; req.on('data', c => { s += c }); req.on('end', () => { try { r(s ? JSON.parse(s) : null) } catch { r(null) } }) })

const STORED = new Map() // "bucket/path" -> { type, bytes }
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (req.method === 'OPTIONS') return send(res, 204)
  const p = url.pathname

  if (p === '/__session') {
    const as = url.searchParams.get('as')
    const s = sessionFor(as === 'admin' ? 'admin' : as === 'newtutor' ? 'newtutor' : 'tutor')
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
  // Storage (T-0766): the photo bucket, kept in memory. MOCK_STORAGE_MISSING=1 answers "Bucket not found" to every upload (the bucket was never made).
  if (p.startsWith('/storage/v1/object/')) {
    const rest = decodeURIComponent(p.slice('/storage/v1/object/'.length))
    const chunks = []; for await (const c of req) chunks.push(c)
    const bytes = Buffer.concat(chunks)
    if (req.method === 'GET' && rest.startsWith('public/')) {
      const f = STORED.get(rest.slice('public/'.length))
      if (!f) return send(res, 404, { message: 'not found' })
      res.writeHead(200, { 'content-type': f.type, 'access-control-allow-origin': '*' }); return res.end(f.bytes)
    }
    if (req.method === 'POST') {
      if (process.env.MOCK_STORAGE_MISSING) return send(res, 404, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' })
      STORED.set(rest, { type: String(req.headers['content-type'] ?? 'application/octet-stream'), bytes })
      return send(res, 200, { Key: rest, Id: rest })
    }
    if (req.method === 'DELETE') {
      let prefixes = []; try { prefixes = JSON.parse(bytes.toString() || '{}').prefixes ?? [] } catch { /* none */ }
      for (const x of prefixes) STORED.delete(`${rest}/${x}`)
      return send(res, 200, [])
    }
    return send(res, 405, { message: 'method not allowed' })
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
  // The real availability table (001_schema.sql): day_of_week is a whole number 0 to 6 and there are only these columns. The stand-in
  // refuses what the database would refuse, so the onboarding hours can be tried here (T-0728); MOCK_FAIL_AVAILABILITY=1 refuses every
  // write of hours, to see the error the tutor is shown.
  if (t === 'availability' && req.method === 'POST') {
    const COLUMNS = ['id', 'tutor_id', 'day_of_week', 'start_time', 'end_time', 'created_at', 'team_member_id']
    if (process.env.MOCK_FAIL_AVAILABILITY) return send(res, 500, { code: 'XX000', message: 'the stand-in is set to refuse hours', details: null, hint: null })
    for (const r of Array.isArray(body) ? body : [body ?? {}]) {
      const extra = Object.keys(r).find(k => !COLUMNS.includes(k))
      if (extra) return send(res, 400, { code: '42703', message: `column "${extra}" of relation "availability" does not exist`, details: null, hint: null })
      if (!Number.isInteger(r.day_of_week) || r.day_of_week < 0 || r.day_of_week > 6) return send(res, 400, { code: '22P02', message: `invalid input syntax for type integer: "${r.day_of_week}"`, details: null, hint: null })
    }
  }
  if (req.method === 'POST') {
    // the real feedback table stamps the time itself (migration 020); the stand-in does the same for that one table
    const list = (Array.isArray(body) ? body : [body ?? {}]).map(r => ({ id: r.id ?? `00000000-0000-4000-9000-${String(Date.now() % 1e12).padStart(12, '0')}`, ...(t === 'feedback' ? { created_at: new Date().toISOString() } : {}), ...r }))
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
    const removed = []
    for (let i = table.length - 1; i >= 0; i--) if (matchRow(table[i], params)) removed.push(...table.splice(i, 1))
    // like PostgREST: with Prefer return=representation (a .select() after .delete()) the removed rows come back
    return /return=representation/.test(prefer) ? send(res, 200, removed.map(r => project(t, r, select))) : send(res, 204)
  }
  send(res, 405, { message: 'method not allowed' })
}).listen(PORT, '127.0.0.1', () => console.log(`mock supabase (FAKE data) on http://localhost:${PORT} (this machine only)`))
