// The tutor's own card payment link (a Stripe Payment Link). It is stored in the
// existing tutors.paddle_checkout_link column, so no data change is needed.
// Only https addresses are accepted, and the booking page checks again before it
// draws the button (the column can also be written straight to the database).
// Import-free so the node tests can load it.

export const CARD_LINK_MAX_LENGTH = 2048

export const CARD_LINK_ERROR =
  'Please paste a link that starts with https:// (for example https://buy.stripe.com/...).'

/** The address as a clean https URL, or null when it is not a safe card payment link. */
export function safeHttpsUrl(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim()
  if (!text || text.length > CARD_LINK_MAX_LENGTH) return null
  if (/[\u0000-\u001f\u007f\s]/.test(text)) return null
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (!url.hostname.includes('.') || url.username || url.password) return null
  return url.href
}

export type CardLinkCheck = { ok: true; value: string } | { ok: false; message: string }

/** Settings form check. Empty is fine (it clears the link). */
export function checkCardPaymentLink(raw: string | null | undefined): CardLinkCheck {
  const text = (raw ?? '').trim()
  if (text === '') return { ok: true, value: '' }
  const url = safeHttpsUrl(text)
  return url ? { ok: true, value: text } : { ok: false, message: CARD_LINK_ERROR }
}

/**
 * What to do with the link field when the tutor presses Save.
 * - a valid or empty link is saved (trimmed);
 * - a link that is not https is refused when the tutor changed it, and nothing
 *   is sent, so the saved link stays as it was;
 * - an older saved value that is not https and was left alone passes through
 *   untouched, so unrelated settings can still be saved.
 */
export function cardLinkForSave(
  current: string,
  saved: string,
): { save: true; value: string } | { save: false; message: string } {
  const check = checkCardPaymentLink(current)
  if (check.ok) return { save: true, value: check.value }
  if (current.trim() === (saved ?? '').trim()) return { save: true, value: current }
  return { save: false, message: check.message }
}
