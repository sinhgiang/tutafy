import { createAdminClient } from '@/lib/supabase/server'

// Events tutors can subscribe to (used by Zapier triggers and any custom webhook).
export const WEBHOOK_EVENTS = [
  'student.created',
  'lesson.created',
  'lesson.completed',
  'payment.received',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export function isWebhookEvent(v: string): v is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(v)
}

// POST `payload` to every URL a tutor has subscribed to `event`. Fire-and-forget:
// failures never block or throw into the caller (a booking must still succeed
// even if a Zapier endpoint is down). Each delivery has a short timeout.
export async function fireWebhooks(tutorId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data: subs } = await supabase
      .from('webhook_subscriptions')
      .select('target_url')
      .eq('tutor_id', tutorId)
      .eq('event', event)
    if (!subs || subs.length === 0) return

    const body = JSON.stringify({ event, created_at: new Date().toISOString(), data })
    await Promise.allSettled(subs.map(s => {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 8000)
      return fetch(s.target_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Tutafy-Webhooks/1' },
        body,
        signal: controller.signal,
      }).catch(() => {}).finally(() => clearTimeout(t))
    }))
  } catch { /* never let webhook delivery break the caller */ }
}
