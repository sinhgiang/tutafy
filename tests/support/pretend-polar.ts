// Test helper: a PRETEND Polar for the pages that read it (the Buyers page and the tutor's own page, T-0705 and T-0707). It replaces the
// global fetch for the length of a test, answers the two lists the readers ask for (subscriptions and orders, paged 100 at a time like
// the real one) from the arrays it is given, and writes down every request so a test can say "only reads were made".
const DAY = 86_400_000
/** An ISO time this many days from now (negative: ago). */
export const at = (days: number) => new Date(Date.now() + days * DAY).toISOString()

/** One subscription as Polar's list shapes it: $12 a month, active, started 80 days ago, next charge in 5 days. */
export const sub = (id: string, o: Record<string, unknown> = {}) => ({
  id, status: 'active', amount: 1200, currency: 'usd', recurring_interval: 'month', cancel_at_period_end: false,
  started_at: at(-80), current_period_end: at(5), ends_at: null, customer: { email: 'private-customer@example.com' }, ...o,
})
/** One order: paid, `total` in cents, USD, for that subscription. */
export const order = (subscriptionId: string, total: number, o: Record<string, unknown> = {}) => ({
  id: `ord_${Math.random()}`, status: 'paid', total_amount: total, currency: 'usd', subscription_id: subscriptionId, ...o,
})
export const reply = (status: number, body: unknown = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

export type Call = { url: string; method: string; auth: string }

export function withPolar(subscriptions: unknown[], orders: unknown[], over: { subs?: () => unknown; ordersReply?: () => unknown } = {}) {
  const calls: Call[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: string, init?: { method?: string; headers?: Record<string, string> }) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', auth: init?.headers?.Authorization ?? '' })
    const page = Number(/page=(\d+)/.exec(String(url))?.[1] ?? 1)
    const isOrders = String(url).includes('/v1/orders/')
    const special = isOrders ? over.ordersReply?.() : over.subs?.()
    if (special) return special
    const all = isOrders ? orders : subscriptions
    return { ok: true, status: 200, json: async () => ({ items: all.slice((page - 1) * 100, page * 100) }) }
  }) as unknown as typeof fetch
  return { calls, restore: () => { globalThis.fetch = realFetch } }
}
