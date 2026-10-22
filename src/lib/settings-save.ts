// The writes behind the Save button of Settings, in one place so a test can run them for real (the page itself is a client page the
// test runner cannot run). Four parts are written one after the other: the main columns, currency, "Made with Tutafy" and the
// lesson lengths. The last three have columns that may not exist yet (migrations 018 and 021), so each is written on its own.
// A part that fails never stops the parts after it, and the saved copy only takes the values that were really written.
import { lengthSaveErrorMessage, durationColumnsToSave } from '@/lib/lesson-durations'

export type SettingsForm = {
  name: string
  bio: string
  timezone: string
  cancellation_hours: number
  booking_url_active: boolean
  buffer_minutes: number
  paypal_link: string
  paddle_checkout_link: string
  default_lesson_price: string
  contract_template: string
  trial_enabled: boolean
  trial_price: string
  currency: string
  lesson_durations: number[]
  default_lesson_duration: number
  hide_branding: boolean
}

type DbError = { message: string; code?: string } | null
export type SettingsDb = {
  from(table: 'tutors'): { update(values: Record<string, unknown>): { eq(column: string, value: string): PromiseLike<{ error: DbError }> } }
}

export const BRANDING_NOT_AVAILABLE = 'This option is not available yet. Your other settings are saved.'
const BRANDING_NOT_AVAILABLE_ALONE = 'The "Made with Tutafy" option is not available yet.'

export type SettingsSaveResult =
  | { ok: true; snapshot: string }
  // the main update was refused: nothing else was tried, the saved copy stays as it was
  | { ok: false; stage: 'main'; snapshot: string; message: string }
  // the main update worked; one or both of the optional parts did not. `snapshot` holds only what really got in.
  | { ok: false; stage: 'optional'; snapshot: string; message: string }

/**
 * @param form          what the tutor sees now
 * @param savedSnapshot the JSON of the last loaded or saved form ('' when nothing was loaded)
 * @param cardLink      the checked card payment link (cardLinkForSave decides it before this runs)
 */
export async function saveTutorSettings(db: SettingsDb, userId: string, form: SettingsForm, savedSnapshot: string, cardLink: string): Promise<SettingsSaveResult> {
  const { currency, lesson_durations, default_lesson_duration, hide_branding, ...rest } = form
  const { error } = await db.from('tutors').update({
    ...rest,
    paddle_checkout_link: cardLink,
    default_lesson_price: rest.default_lesson_price ? parseFloat(rest.default_lesson_price) : null,
    trial_price: rest.trial_price ? parseFloat(rest.trial_price) : null,
  }).eq('id', userId)
  if (error) return { ok: false, stage: 'main', snapshot: savedSnapshot, message: error.message }

  // Currency column may not exist yet — update separately and swallow errors
  try {
    await db.from('tutors').update({ currency }).eq('id', userId)
  } catch { /* currency column pending migration */ }

  const before = savedSnapshot ? JSON.parse(savedSnapshot) : null
  // What the saved copy will say: the form, except for a part that did not get written (it keeps what the database still has).
  const saved: SettingsForm = { ...form }
  let brandingFailed = false
  let lengthMessage = ''

  // "Made with Tutafy": its own column may not exist yet (migration 021), so it is written apart, and only when the tutor changed it.
  // The pages decide by the PLAN first (src/lib/branding.ts), so a Free tutor writing true here changes nothing on their page.
  const savedBranding = before ? before.hide_branding === true : false
  if (hide_branding !== savedBranding) {
    const { error: brandingError } = await db.from('tutors').update({ hide_branding }).eq('id', userId)
    if (brandingError) { brandingFailed = true; saved.hide_branding = savedBranding }
  }

  // Lesson lengths: only when the tutor changed them. The update names this signed-in tutor's own row
  // (the database policy allows nothing else) and the values are cleaned first: whole minutes from 10 to 240 in steps of 5, one
  // to six lengths, none twice, and the default one of them (cleanDurations in src/lib/lesson-durations.ts).
  const lengthColumns = durationColumnsToSave(
    before ? { durations: before.lesson_durations, defaultDuration: before.default_lesson_duration } : null,
    { durations: lesson_durations, defaultDuration: default_lesson_duration },
  )
  if (lengthColumns) {
    const { error: lengthError } = await db.from('tutors').update(lengthColumns).eq('id', userId)
    if (lengthError) {
      saved.lesson_durations = before?.lesson_durations ?? form.lesson_durations
      saved.default_lesson_duration = before?.default_lesson_duration ?? form.default_lesson_duration
      lengthMessage = lengthSaveErrorMessage(lengthError, { durations: lesson_durations, defaultDuration: default_lesson_duration })
    }
  }

  const snapshot = JSON.stringify(saved)
  if (!brandingFailed && !lengthMessage) return { ok: true, snapshot }
  // Both failed: the sentence about the lengths already says "your other settings are saved", which is only true for the main
  // columns now, so the branding part is named instead of hidden.
  const message = lengthMessage
    ? (brandingFailed ? `${lengthMessage} ${BRANDING_NOT_AVAILABLE_ALONE}` : lengthMessage)
    : BRANDING_NOT_AVAILABLE
  return { ok: false, stage: 'optional', snapshot, message }
}
