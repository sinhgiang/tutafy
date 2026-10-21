// How long the text a stranger types may be, where it ends up inside an email (T-0686). Checked on the server;
// a page that hides or shortens a field is not the check.

export const MAX_NAME_LENGTH = 200
export const MAX_EMAIL_LENGTH = 254
/** A booking note or a portal message. */
export const MAX_MESSAGE_LENGTH = 2000

const within = (value: unknown, max: number) => typeof value !== 'string' || value.length <= max

export function withinBookingTextLimits(input: { name?: unknown; email?: unknown; message?: unknown }): boolean {
  return within(input.name, MAX_NAME_LENGTH) && within(input.email, MAX_EMAIL_LENGTH) && within(input.message, MAX_MESSAGE_LENGTH)
}

export function withinMessageLimit(content: unknown): boolean {
  return within(content, MAX_MESSAGE_LENGTH)
}
