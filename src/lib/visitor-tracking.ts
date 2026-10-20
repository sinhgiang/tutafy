// The server side of the visitor journey (see supabase/migrations/015_visitor_tracking.sql).
// The Supabase client is passed in, so the node tests can hand in a fake. Nothing
// here reads or stores an IP address: the country is the code Vercel puts in a header.
import { z } from 'zod'
import { classifySource, cleanUtm, referrerHost } from '@/lib/visitor-source'
import { normalizeTrackedPath } from '@/lib/track-path'

export const VISITOR_COOKIE = 'tutafy_vid'
export const VISITOR_COOKIE_MAX_AGE = 395 * 24 * 60 * 60 // 13 months

const trackBody = z.object({
  consent: z.literal('accepted'),
  kind: z.enum(['page_view', 'checkout_click', 'identify']),
  path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  utm: z.object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(100).optional(),
  }).optional(),
  gclid: z.boolean().optional(),
  plan: z.enum(['pro', 'academy']).optional(),
}).strict()

export type TrackBody = z.infer<typeof trackBody>

/** A request counts only if the visitor said they accepted cookies and the shape is exactly what we expect. */
export function parseTrackBody(json: unknown): { ok: true; data: TrackBody } | { ok: false } {
  const r = trackBody.safeParse(json)
  return r.success ? { ok: true, data: r.data } : { ok: false }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validVisitorId(value: string | null | undefined): string | null {
  return value && UUID.test(value) ? value.toLowerCase() : null
}

/** Two-letter country code from Vercel's x-vercel-ip-country header; anything else is null. */
export function countryFromHeader(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(v) ? v : null
}

// Only the part of the Supabase client this file calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TrackingClient = { from(table: string): any }

export type RecordInput = {
  visitorId: string
  body: TrackBody
  country: string | null
  /** The signed-in tutor's id when the request carries a valid session; never taken from the body. */
  userId: string | null
}

/**
 * Write one event for a consented visitor: make the visitor row if it is missing
 * (first source decided now), add the event, and link the visitor to the tutor account
 * when the request is signed in. Returns what it wrote, for the tests.
 */
export async function recordVisitorEvent(admin: TrackingClient, input: RecordInput): Promise<{ wrote: boolean }> {
  const { visitorId, body, country, userId } = input
  const path = normalizeTrackedPath(body.path)

  // A page view or checkout click on a page we do not track is dropped. 'identify' has no page.
  if (body.kind !== 'identify' && path === null) return { wrote: false }

  const { error: upsertError } = await admin.from('visitors').upsert({
    id: visitorId,
    country,
    first_source: classifySource({
      referrerHost: referrerHost(body.referrer),
      utmSource: body.utm?.source,
      utmMedium: body.utm?.medium,
      gclid: body.gclid,
    }),
    first_referrer_host: referrerHost(body.referrer),
    first_path: path,
    utm_source: cleanUtm(body.utm?.source),
    utm_medium: cleanUtm(body.utm?.medium),
    utm_campaign: cleanUtm(body.utm?.campaign),
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (upsertError) return { wrote: false }

  let wrote = false
  if (body.kind === 'page_view' || body.kind === 'checkout_click') {
    const { error } = await admin.from('visitor_events').insert({
      visitor_id: visitorId,
      kind: body.kind,
      path,
      plan: body.kind === 'checkout_click' ? (body.plan ?? null) : null,
    })
    wrote = !error
  }

  if (userId && (body.kind === 'identify' || body.kind === 'checkout_click')) {
    // Never overwrites an earlier link; a failure (for example a student account that
    // is not a tutor) is not an error for the visitor.
    await admin.from('visitors').update({ tutor_id: userId }).eq('id', visitorId).is('tutor_id', null)
  }
  return { wrote }
}

/** Polar says a paid plan is active: add one "order_paid" event for the visitor linked to this tutor. */
export async function recordOrderPaid(admin: TrackingClient, tutorId: string, plan: string): Promise<{ wrote: boolean }> {
  if (plan !== 'pro' && plan !== 'academy') return { wrote: false }
  const { data: visitor } = await admin.from('visitors').select('id').eq('tutor_id', tutorId)
    .order('first_seen_at', { ascending: false }).limit(1).maybeSingle()
  if (!visitor?.id) return { wrote: false } // this tutor never consented to tracking: nothing to add

  const { data: already } = await admin.from('visitor_events').select('id')
    .eq('visitor_id', visitor.id).eq('kind', 'order_paid').eq('plan', plan).limit(1)
  if (already && already.length > 0) return { wrote: false } // Polar sends updates for the same subscription

  const { error } = await admin.from('visitor_events').insert({ visitor_id: visitor.id, kind: 'order_paid', path: null, plan })
  return { wrote: !error }
}

/** The visitor withdrew consent: delete their row (their events go with it). */
export async function forgetVisitor(admin: TrackingClient, visitorId: string): Promise<void> {
  await admin.from('visitors').delete().eq('id', visitorId)
}
