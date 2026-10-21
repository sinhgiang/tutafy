// The in-app Feedback box (T-0723): what a message looks like, and how a body from the browser is read.
// No imports from the app, so the node tests can load it.
//
// What is kept (supabase/migrations/020_feedback.sql): when, the author's role and email as the SERVER knows them (the signed-in
// session, or a valid student link), the kind and the text. Nothing is read from the request but those two fields.

export const FEEDBACK_KINDS = ['bug', 'idea', 'question'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

/** The words the box shows for each kind (the owner's admin page has its own, translated, in the admin translation table). */
export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, { label: string; hint: string }> = {
  bug: { label: 'Bug', hint: 'Something is broken or confusing' },
  idea: { label: 'Idea', hint: 'Something you would like Tutafy to do' },
  question: { label: 'Question', hint: 'Something you could not find out' },
}

export const FEEDBACK_MAX_LENGTH = 2000
/** A body longer than this is refused before anything is read (a made-up caller sending megabytes). */
export const FEEDBACK_MAX_BODY_CHARS = 10_000
/** A student link is a short signed string; anything longer is not one. */
const TOKEN_MAX_CHARS = 2_000

/** The text as it is kept: line breaks made plain, control characters (except new lines and tabs) taken out, the ends trimmed. */
export function cleanFeedbackText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
}

export type FeedbackBody = { kind: FeedbackKind; message: string; token: string | null }

export function parseFeedbackBody(json: unknown): { ok: true; data: FeedbackBody } | { ok: false; error: string } {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return { ok: false, error: 'Send the kind and your message.' }
  const raw = json as Record<string, unknown>
  if (typeof raw.kind !== 'string' || !(FEEDBACK_KINDS as readonly string[]).includes(raw.kind)) return { ok: false, error: 'Pick bug, idea or question.' }
  if (typeof raw.message !== 'string') return { ok: false, error: 'Write your message first.' }
  if (raw.message.length > FEEDBACK_MAX_BODY_CHARS) return { ok: false, error: `Keep it under ${FEEDBACK_MAX_LENGTH} characters.` }
  const message = cleanFeedbackText(raw.message)
  if (!message) return { ok: false, error: 'Write your message first.' }
  if (message.length > FEEDBACK_MAX_LENGTH) return { ok: false, error: `Keep it under ${FEEDBACK_MAX_LENGTH} characters.` }
  let token: string | null = null
  if (raw.token !== undefined && raw.token !== null && raw.token !== '') {
    if (typeof raw.token !== 'string' || raw.token.length > TOKEN_MAX_CHARS) return { ok: false, error: 'Send the kind and your message.' }
    token = raw.token
  }
  return { ok: true, data: { kind: raw.kind as FeedbackKind, message, token } }
}
