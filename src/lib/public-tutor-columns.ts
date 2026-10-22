// The columns of `tutors` that each public page is allowed to read (T-0774). No imports, so a node test can load it.
//
// Why this file exists: the database used to let a visitor's key read EVERY column of a tutor whose booking page is on (the email, the
// Google Calendar refresh token, the push subscription, the Stripe and Polar ids, the plan, the contract text; see
// docs/tutors-rls/README.md). The public pages now read the tutor on the SERVER with the admin client (src/lib/public-tutor.ts) and
// ask for exactly the columns below, so a column nobody listed here can never reach a browser, however the table grows.
//
// A column is public only when the page shows it (or needs it to work). Rules, kept by tests/public-tutor-columns.test.ts:
//   - every list is a subset of PUBLIC_TUTOR_COLUMNS;
//   - none of the private columns (the email, the tokens, the Stripe and Polar ids, the plan, ...) is ever in a list;
//   - the three payment/contract columns (PAYMENT_COLUMNS) are in the booking pages only: the student pays and signs there.
//
// A new column goes in one list here, on purpose, with the page that shows it. `select('*')` on `tutors` is refused by the scan test.

/** What a public page may show about a tutor. */
export const PUBLIC_TUTOR_COLUMNS = [
  'id', 'slug', 'name', 'bio', 'avatar_url', 'timezone', 'languages', 'cancellation_hours', 'booking_url_active', 'buffer_minutes',
  'default_lesson_price', 'currency', 'average_rating', 'review_count', 'trial_enabled', 'trial_price', 'created_at',
] as const

/**
 * Shown to the student who is about to pay or sign, on the booking pages only: where to pay (a PayPal name or link, the tutor's own
 * card payment link) and the contract text the student agrees to. They are not a login or an account id, but they ARE what the tutor
 * typed for students, so they stay out of every other page.
 */
export const PAYMENT_COLUMNS = ['paypal_link', 'paddle_checkout_link', 'contract_template'] as const

/** Columns that must never reach a visitor. The test fails if a list below contains one. */
export const PRIVATE_TUTOR_COLUMNS = [
  'email', 'stripe_account_id', 'stripe_onboarding_complete', 'subscription_status', 'subscription_expires_at', 'polar_subscription_id',
  'polar_checkout_id', 'google_calendar_refresh_token', 'google_calendar_id', 'notify_new_booking', 'notify_new_message', 'referral_credits',
  'referred_by', 'custom_domain', 'push_subscription',
] as const

const list = (cols: readonly string[]) => cols.join(', ')

/** /book/<slug> */
export const BOOKING_PAGE_COLUMNS = list([
  'id', 'name', 'bio', 'avatar_url', 'timezone', 'languages', 'cancellation_hours', 'booking_url_active', 'buffer_minutes',
  'default_lesson_price', 'average_rating', 'review_count', 'trial_enabled', 'trial_price', 'currency', ...PAYMENT_COLUMNS,
])

/** /book/<slug>/<member>: the bookable identity is the team member's, so no bio or photo of the tutor is read. */
export const MEMBER_PAGE_COLUMNS = list([
  'id', 'name', 'timezone', 'languages', 'cancellation_hours', 'booking_url_active', 'buffer_minutes', 'default_lesson_price',
  'trial_enabled', 'trial_price', 'currency', ...PAYMENT_COLUMNS,
])

/** /embed/<slug> */
export const EMBED_PAGE_COLUMNS = list([
  'id', 'name', 'bio', 'avatar_url', 'timezone', 'languages', 'cancellation_hours', 'booking_url_active', 'buffer_minutes',
  'default_lesson_price', 'currency', 'average_rating', 'review_count', 'trial_enabled', 'trial_price', ...PAYMENT_COLUMNS,
])

/** /tutors/<slug>, the public profile: no payment column. */
export const PROFILE_PAGE_COLUMNS = list([
  'id', 'name', 'bio', 'avatar_url', 'timezone', 'languages', 'slug', 'average_rating', 'review_count', 'default_lesson_price',
  'booking_url_active', 'cancellation_hours', 'trial_enabled', 'trial_price', 'currency', 'buffer_minutes', 'created_at',
])

/** The sitemap: the address of the page, nothing else. */
export const SITEMAP_COLUMNS = 'slug'

/** The student's own page: who the tutor is, to draw the lesson cards. */
export const STUDENT_PAGE_COLUMNS = 'id, name, avatar_url, slug'

/** Every list a page uses, by the page that uses it (the test walks this). */
export const COLUMNS_BY_PAGE = {
  '/book/[slug]': BOOKING_PAGE_COLUMNS,
  '/book/[slug]/[member]': MEMBER_PAGE_COLUMNS,
  '/embed/[slug]': EMBED_PAGE_COLUMNS,
  '/tutors/[slug]': PROFILE_PAGE_COLUMNS,
  '/sitemap.xml': SITEMAP_COLUMNS,
  '/student/dashboard': STUDENT_PAGE_COLUMNS,
} as const

export const splitColumns = (cols: string): string[] => cols.split(',').map(c => c.trim()).filter(Boolean)
