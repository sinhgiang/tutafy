// What the AI routes answer when the server has no AI key. Customers get a plain
// sentence; the real reason (which setting is missing) goes only to the server
// log. Import-free so the node tests can load it.

export const AI_UNAVAILABLE_MESSAGE = 'AI is not available right now. Please try again later.'

/** 503 for a customer, plus one server-log line naming the route (never the key). */
export function aiUnavailableResponse(route: string): Response {
  console.error(`[ai] ${route}: the AI key is not set on the server`)
  return Response.json({ error: AI_UNAVAILABLE_MESSAGE, code: 'ai_unavailable' }, { status: 503 })
}
