// The numbers and the input rules of the business pages (T-0825): Packages, Coupons, Subscriptions, Waitlist and Team each open with a
// row of figures and a list. This file computes the figures and checks what the write routes accept. Pure, so tests can run it.

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : NaN }
const whole = (v: unknown) => { const n = num(v); return Number.isInteger(n) ? n : NaN }

// ---- packages -------------------------------------------------------------------------------------------------------------------

export type PackageInput = { name: string; description: string | null; lessons_count: number; price: number }

/** What a new package may be: a name, a whole number of lessons from 1 to 200, a price above zero and under a million. */
export function validatePackage(body: unknown): { ok: true; value: PackageInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (name.length < 1 || name.length > 80) return { ok: false, error: 'Give the package a name of up to 80 characters' }
  const lessons = whole(b.lessons_count)
  if (!(lessons >= 1 && lessons <= 200)) return { ok: false, error: 'Lessons must be a whole number from 1 to 200' }
  const price = num(b.price)
  if (!(price > 0 && price < 1_000_000)) return { ok: false, error: 'Price must be more than zero' }
  const description = typeof b.description === 'string' && b.description.trim() ? b.description.trim().slice(0, 300) : null
  return { ok: true, value: { name, description, lessons_count: lessons, price: Math.round(price * 100) / 100 } }
}

export function packageStats(list: { price: number | string; lessons_count: number }[]) {
  const perLesson = list.filter(p => Number(p.lessons_count) > 0).map(p => Number(p.price) / Number(p.lessons_count))
  return {
    count: list.length,
    lessons: list.reduce((n, p) => n + Number(p.lessons_count || 0), 0),
    cheapest: perLesson.length ? Math.min(...perLesson) : null,
    dearest: list.length ? Math.max(...list.map(p => Number(p.price))) : null,
  }
}

// ---- coupons --------------------------------------------------------------------------------------------------------------------

export type CouponInput = { code: string; discount_type: 'percent' | 'fixed'; discount_value: number; max_uses: number | null; expires_at: string | null }

/** A code is 3 to 24 letters, digits, dashes or underscores; a percentage is 1 to 100; a fixed amount is above zero. */
export function validateCoupon(body: unknown): { ok: true; value: CouponInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : ''
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { ok: false, error: 'A code is 3 to 24 letters, digits, dashes or underscores' }
  const type = b.discount_type
  if (type !== 'percent' && type !== 'fixed') return { ok: false, error: 'Choose percentage or fixed amount' }
  const value = num(b.discount_value)
  if (!(value > 0) || (type === 'percent' && value > 100) || value > 100_000) return { ok: false, error: type === 'percent' ? 'A percentage is from 1 to 100' : 'The amount must be more than zero' }
  let max: number | null = null
  if (b.max_uses !== null && b.max_uses !== undefined && b.max_uses !== '') {
    max = whole(b.max_uses)
    if (!(max >= 1 && max <= 100000)) return { ok: false, error: 'Max uses must be a whole number of 1 or more' }
  }
  let expires: string | null = null
  if (typeof b.expires_at === 'string' && b.expires_at) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.expires_at) || Number.isNaN(new Date(b.expires_at).getTime())) return { ok: false, error: 'Choose a valid expiry date' }
    expires = b.expires_at
  }
  return { ok: true, value: { code, discount_type: type, discount_value: value, max_uses: max, expires_at: expires } }
}

export type CouponRow = { active: boolean; max_uses: number | null; uses_count: number; expires_at: string | null }
export type CouponState = 'active' | 'expired' | 'used up' | 'off'

export function couponState(c: CouponRow, now: Date): CouponState {
  if (!c.active) return 'off'
  if (c.expires_at && new Date(c.expires_at).getTime() < now.getTime()) return 'expired'
  if (c.max_uses !== null && c.uses_count >= c.max_uses) return 'used up'
  return 'active'
}

export function couponStats(list: CouponRow[], now: Date) {
  const soon = now.getTime() + 30 * 86_400_000
  return {
    active: list.filter(c => couponState(c, now) === 'active').length,
    redeemed: list.reduce((n, c) => n + Number(c.uses_count || 0), 0),
    expiringSoon: list.filter(c => couponState(c, now) === 'active' && c.expires_at && new Date(c.expires_at).getTime() < soon).length,
    total: list.length,
  }
}

// ---- subscription plans ---------------------------------------------------------------------------------------------------------

export const PLAN_PERIODS = ['month', 'week'] as const

export type PlanInput = { name: string; description: string | null; price: number; currency: string; lessons_per_period: number; period: 'month' | 'week'; duration_minutes: number }

export function validatePlan(body: unknown): { ok: true; value: PlanInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (name.length < 1 || name.length > 80) return { ok: false, error: 'Give the plan a name of up to 80 characters' }
  const price = num(b.price)
  if (!(price > 0 && price < 1_000_000)) return { ok: false, error: 'Price must be more than zero' }
  const lessons = whole(b.lessons_per_period)
  if (!(lessons >= 1 && lessons <= 100)) return { ok: false, error: 'Lessons per period must be a whole number from 1 to 100' }
  if (!(PLAN_PERIODS as readonly unknown[]).includes(b.period)) return { ok: false, error: 'Choose monthly or weekly' }
  const duration = b.duration_minutes === undefined || b.duration_minutes === '' ? 60 : whole(b.duration_minutes)
  if (!(duration >= 10 && duration <= 240)) return { ok: false, error: 'Duration must be from 10 to 240 minutes' }
  const currency = typeof b.currency === 'string' && /^[a-zA-Z]{3}$/.test(b.currency) ? b.currency.toLowerCase() : 'usd'
  const description = typeof b.description === 'string' && b.description.trim() ? b.description.trim().slice(0, 300) : null
  return { ok: true, value: { name, description, price: Math.round(price * 100) / 100, currency, lessons_per_period: lessons, period: b.period as 'month' | 'week', duration_minutes: duration } }
}

/** The only fields a tutor may change on a plan after it exists (the old route wrote whatever it was sent, including tutor_id). */
export function pickPlanUpdates(body: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  if ('is_active' in b) { if (typeof b.is_active !== 'boolean') return { ok: false, error: 'is_active must be true or false' }; out.is_active = b.is_active }
  if ('name' in b) { if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 80) return { ok: false, error: 'Give the plan a name of up to 80 characters' }; out.name = b.name.trim() }
  if ('description' in b) { if (b.description !== null && (typeof b.description !== 'string' || b.description.length > 300)) return { ok: false, error: 'Description is up to 300 characters' }; out.description = b.description }
  if (Object.keys(out).length === 0) return { ok: false, error: 'Nothing to change' }
  return { ok: true, value: out }
}

export function planStats(list: { is_active: boolean; price: number | string; lessons_per_period: number }[]) {
  const active = list.filter(p => p.is_active)
  const per = active.filter(p => Number(p.lessons_per_period) > 0).map(p => Number(p.price) / Number(p.lessons_per_period))
  return { total: list.length, active: active.length, cheapestPerLesson: per.length ? Math.min(...per) : null }
}

// ---- waitlist -------------------------------------------------------------------------------------------------------------------

export function waitlistStats(list: { created_at: string; message: string | null }[], now: Date) {
  const week = now.getTime() - 7 * 86_400_000
  return {
    waiting: list.length,
    thisWeek: list.filter(e => new Date(e.created_at).getTime() >= week).length,
    withMessage: list.filter(e => (e.message ?? '').trim() !== '').length,
  }
}

/** A short person-friendly "3 days ago" for a list row. */
export function ago(iso: string, now: Date): string {
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (d <= 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d} days ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
