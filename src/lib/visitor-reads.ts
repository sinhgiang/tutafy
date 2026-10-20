// Shared database reads for the owner's pages (/super-admin and the per-person journey).
// All of them are read-only and page with range() (see paged-read.ts), so the 1000-rows-per-
// request limit never cuts a list. The client is passed in (the service-role client, from a
// page that already passed the admin gate), so the node tests can use a fake.
import type { BuyersClient } from '@/lib/buyers-data'
import type { EventRow } from '@/lib/journey'
import { CHUNK, chunks, readAll, type ReadState } from '@/lib/paged-read'

export const MILESTONES = ['checkout_click', 'order_paid']
export const EVENT_COLUMNS = 'id, visitor_id, kind, path, plan, created_at'
export const VISITOR_COLUMNS = 'id, first_seen_at, country, first_source, first_path, tutor_id'
export const VISITOR_DETAIL_COLUMNS = `${VISITOR_COLUMNS}, first_referrer_host, utm_source, utm_medium, utm_campaign`

/** A select on visitor_events with the columns every reader needs. */
export function eventsQuery(admin: BuyersClient) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (admin.from('visitor_events') as any).select(EVENT_COLUMNS)
}

/** Page views of one visitor up to and including `endAt`, read in full. */
export async function pageViewsUpTo(admin: BuyersClient, visitorId: string, endAt: string, state: ReadState): Promise<EventRow[]> {
  return readAll<EventRow>(() => eventsQuery(admin)
    .eq('visitor_id', visitorId).eq('kind', 'page_view').lte('created_at', endAt)
    .order('created_at', { ascending: true }).order('id', { ascending: true }), state)
}

/** Checkout clicks and paid orders of these visitors, oldest first. */
export async function milestoneEvents(admin: BuyersClient, visitorIds: string[], state: ReadState): Promise<EventRow[]> {
  const out: EventRow[] = []
  for (const ids of chunks(visitorIds, CHUNK)) {
    const rows = await readAll<EventRow>(() => eventsQuery(admin)
      .in('visitor_id', ids).in('kind', MILESTONES)
      .order('created_at', { ascending: true }).order('id', { ascending: true }), state)
    for (const r of rows) out.push(r) // a loop, not push(...rows): a read can be 100 000 rows long
  }
  return out
}
