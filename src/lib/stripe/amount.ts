// The amount Stripe is asked to charge, in the currency's smallest unit. Import-free so the node
// tests can load it. Stripe counts yen, dong and a few other currencies in whole units (no cents),
// every other one in hundredths, so `price * 100` is wrong for them.
const ZERO_DECIMAL = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
])

/** The price in Stripe's smallest unit, or null if it is not a positive, finite number. */
export function stripeMinorUnits(price: number, currency: string): number | null {
  if (!Number.isFinite(price) || price <= 0) return null
  const units = ZERO_DECIMAL.has(currency.toLowerCase()) ? Math.round(price) : Math.round(price * 100)
  return units > 0 && units <= 99_999_999 ? units : null
}
