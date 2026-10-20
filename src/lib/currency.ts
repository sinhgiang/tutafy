// How a tutor's money is shown (T-0619). A lesson's price is in its TUTOR's currency (`tutors.currency`,
// chosen in Settings and shown on the booking page); `lessons.currency` is never written (it keeps its
// 'USD' default for every lesson), so no page reads it. Everything here is import-free apart from the
// zero-decimal rule shared with the Stripe amount, so the node tests can load it.
import { isZeroDecimalCurrency } from '@/lib/stripe/amount'

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', SGD: 'S$', JPY: '¥', INR: '₹', BRL: 'R$', MXN: 'MX$', VND: '₫',
}

/** A tutor's currency code for display: upper case, three letters; blank (never chosen) means USD, like the booking page. */
export function normalizeCurrency(value: unknown): string {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return /^[A-Z]{3}$/.test(code) ? code : 'USD'
}

/** The symbol for a currency, or its code with a space ("CHF ") when there is no short symbol: never a wrong "$". */
export function currencySymbol(currency: unknown): string {
  const code = normalizeCurrency(currency)
  return CURRENCY_SYMBOLS[code] ?? `${code} `
}

/**
 * An amount with its currency: "€40.00", "₫500,000" (dong and yen have no cents). `whole` drops the
 * decimals for the currencies that have them (chart axes, totals).
 */
export function formatMoney(amount: unknown, currency: unknown, whole = false): string {
  const code = normalizeCurrency(currency)
  const n = Number(amount)
  const value = Number.isFinite(n) ? n : 0
  const digits = whole || isZeroDecimalCurrency(code) ? 0 : 2
  return `${currencySymbol(code)}${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

/** Add up prices without ever adding two currencies together: one total per currency, largest first. */
export function totalsByCurrency(rows: { price?: unknown; currency?: unknown }[]): { currency: string; total: number; count: number }[] {
  const byCode = new Map<string, { currency: string; total: number; count: number }>()
  for (const r of rows) {
    const currency = normalizeCurrency(r.currency)
    const entry = byCode.get(currency) ?? { currency, total: 0, count: 0 }
    entry.total += Number(r.price ?? 0) || 0
    entry.count += 1
    byCode.set(currency, entry)
  }
  return [...byCode.values()].sort((a, b) => b.total - a.total)
}
