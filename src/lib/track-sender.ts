// How the browser talks to /api/track: nothing without consent, and one request at
// a time, in order. The first request is the one that makes the server create the
// visitor and set the cookie, so later requests must wait for its answer (otherwise
// two requests without a cookie would make two different visitors).
// Dependencies are passed in, so the node tests can use the real route handler.
import { createSerialQueue } from '@/lib/serial-queue'

export type TrackSenderDeps = {
  fetch: (url: string, init: { method: string; headers: Record<string, string>; body: string; keepalive: boolean }) => Promise<unknown>
  hasConsent: () => boolean
}

export function createTrackSender(deps: TrackSenderDeps) {
  const queue = createSerialQueue()
  return {
    /** Resolves when the server has answered (or the call failed); never rejects. */
    send(payload: Record<string, unknown>): Promise<void> {
      if (!deps.hasConsent()) return Promise.resolve()
      return queue.run(async () => {
        try {
          await deps.fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ consent: 'accepted', ...payload }),
            keepalive: true,
          })
        } catch { /* tracking never gets in the way */ }
      })
    },
  }
}

/**
 * The body of a page view. In the signed-in area it also asks the server to link the
 * visitor to the tutor account, in THE SAME request, so the visitor row (with its first
 * source) and the link can never end up on two different visitors.
 */
export function pageViewPayload(input: {
  path: string
  landing: Record<string, unknown> | null
  linkAccount: boolean
}): Record<string, unknown> {
  return { kind: 'page_view', path: input.path, ...(input.landing ?? {}), ...(input.linkAccount ? { identify: true } : {}) }
}
