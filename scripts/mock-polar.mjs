// A stand-in for Polar's READ api with FAKE data, to look at the admin Buyers page (T-0705) on this machine. For checking layout only:
// every id, amount and date is made up and nothing is written anywhere. It answers GET /v1/subscriptions/ and GET /v1/orders/ in the
// shape src/lib/buyer-billing.ts reads, and refuses everything that is not a GET.
//
//   node scripts/mock-polar.mjs                       # listens on http://localhost:54398
//   MOCK_POLAR_PORT=54397 node scripts/mock-polar.mjs
//
// Start the app with POLAR_API_BASE=http://localhost:54398 and POLAR_ACCESS_TOKEN=mock-polar-token (on the command line, never in a file).
// Set MOCK_BUYERS=1 on scripts/mock-supabase.mjs so the tutors carry the subscription ids used here.
// MOCK_POLAR_FAIL=orders (or subscriptions, or both) makes that list answer 403, to look at the "could not be read" states.
import http from 'node:http'

const PORT = Number(process.env.MOCK_POLAR_PORT ?? 54398)
const FAIL = (process.env.MOCK_POLAR_FAIL ?? '').split(',').map(s => s.trim()).filter(Boolean)
const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); d.setUTCHours(9, 0, 0, 0); return d.toISOString() }
const sub = (id, o) => ({ id, status: 'active', amount: 1200, currency: 'usd', recurring_interval: 'month', cancel_at_period_end: false, started_at: day(-80), current_period_end: day(5), ends_at: null, ...o })
const order = (subscription_id, total_amount, o = {}) => ({ id: `ord_${Math.random().toString(36).slice(2)}`, status: 'paid', total_amount, currency: 'usd', subscription_id, ...o })

const SUBS = [
  sub('sub_mock_1', {}), // Sarah: Pro, $12 a month, next charge in 5 days
  sub('sub_mock_2', { amount: 12000, recurring_interval: 'year', started_at: day(-100), current_period_end: day(265), cancel_at_period_end: true, ends_at: day(265) }), // Mai: Pro, $120 a year, cancelled, ends in 265 days
  sub('sub_mock_3', { amount: 2900, status: 'past_due', started_at: day(-60), current_period_end: day(-2) }), // the admin's own row: Academy $29, past due
  sub('sub_mock_4', { amount: 2500, currency: 'eur', started_at: day(-45), current_period_end: day(20) }), // Hana: Academy, EUR 25 a month
]
const ORDERS = [
  order('sub_mock_1', 1200), order('sub_mock_1', 1200), order('sub_mock_1', 1200),
  order('sub_mock_2', 12000),
  order('sub_mock_3', 2900), order('sub_mock_3', 2900, { status: 'partially_refunded', refunded_amount: 500 }),
  order('sub_mock_4', 2500, { currency: 'eur' }), order('sub_mock_4', 2500, { currency: 'eur' }),
]

http.createServer((req, res) => {
  const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
  if (req.method !== 'GET') return send(405, { error: 'read only' })
  if (req.headers.authorization !== 'Bearer mock-polar-token') return send(401, { error: 'bad token' })
  const url = new URL(req.url, 'http://localhost')
  const which = url.pathname.startsWith('/v1/orders') ? 'orders' : url.pathname.startsWith('/v1/subscriptions') ? 'subscriptions' : null
  if (!which) return send(404, { error: 'not found' })
  if (FAIL.includes(which) || FAIL.includes('both')) return send(403, { error: 'forbidden' })
  const page = Number(url.searchParams.get('page') ?? 1)
  const limit = Number(url.searchParams.get('limit') ?? 100)
  const all = which === 'orders' ? ORDERS : SUBS
  send(200, { items: all.slice((page - 1) * limit, page * limit) })
}).listen(PORT, () => console.log(`fake Polar (read only) on http://localhost:${PORT}`))
