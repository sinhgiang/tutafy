// "Get ready for the tutor directory" (T-1043): the reminder and the short to-do list at the top of the tutor dashboard.
//
// Why it exists: the directory opens when DIRECTORY_OPENS_AT tutors are listed, and most tutors who signed up never picked free hours, so the booking page
// cannot be booked. This card names the three things that stand between a tutor and the directory, shows how far along they are, and gives one button
// that opens the right place. It is gone when all three are done. The three steps are the tutor's own and nothing else:
//   1. free hours (at least one weekly row in `availability`, the same test as the "no hours" banner);
//   2. an introduction of MIN_INTRO_CHARS characters or more (the directory's own count, introLength());
//   3. at least one language (`tutors.languages`, written from Settings, Profile).
//
// It only READS, and only the signed-in tutor's own rows: the session client, the tutor id named in every query (it comes from the session, never from the
// request). It writes nothing and sends nothing: no email, no message, no notification. DIRECTORY_OPENS_AT is not touched here.
import type { BuyersClient } from '@/lib/buyers-data'
import { MIN_INTRO_CHARS, cleanLanguages, introLength } from '@/lib/directory'

export type SetupStepId = 'hours' | 'intro' | 'languages'

export type SetupStep = {
  id: SetupStepId
  title: string
  hint: string
  done: boolean
  /** The page that opens with the field in view; the same address for a step that is done (a tutor may want to change it). */
  href: string
  /** The button's words. */
  action: string
}

export type DirectorySetup = {
  steps: SetupStep[]
  doneCount: number
  total: number
  /** The first step still to do: the big button goes here. */
  next: SetupStep
  /** The tutor's own time zone, named beside the one-tap hours (T-1105); null when none is saved. */
  timezone: string | null
}

export type SetupFacts = { availabilityRows: number; bio: unknown; languages: unknown; timezone?: unknown }

export const SETUP_TITLE = 'Get ready for the tutor directory'

export function buildDirectorySetup(f: SetupFacts): DirectorySetup | null {
  const introChars = introLength(f.bio)
  const steps: SetupStep[] = [
    {
      id: 'hours', title: 'Choose your free hours', done: f.availabilityRows > 0,
      hint: 'Students can only book you in the hours you choose. Pick a ready-made week below, or set your own.',
      href: '/availability', action: 'Choose free hours',
    },
    {
      id: 'intro', title: 'Write your introduction', done: introChars >= MIN_INTRO_CHARS,
      hint: introChars === 0
        ? `At least ${MIN_INTRO_CHARS} characters: who you teach and what a lesson is like.`
        : `Yours is ${introChars} characters. Aim for at least ${MIN_INTRO_CHARS}.`,
      href: '/settings?tab=profile&focus=intro', action: 'Write introduction',
    },
    {
      id: 'languages', title: 'Say which languages you teach', done: cleanLanguages(f.languages).length > 0,
      hint: 'Students filter the directory by language, so a profile with none cannot be found that way.',
      href: '/settings?tab=profile&focus=languages', action: 'Add languages',
    },
  ]
  const next = steps.find(s => !s.done)
  if (!next) return null
  const timezone = typeof f.timezone === 'string' && f.timezone.trim() ? f.timezone.trim() : null
  return { steps, doneCount: steps.filter(s => s.done).length, total: steps.length, next, timezone }
}

/**
 * Read this tutor's own facts and build the card. A failed read gives null (no card), never a card that tells a tutor who finished that something is missing.
 */
export async function loadDirectorySetup(db: BuyersClient, tutorId: string): Promise<DirectorySetup | null> {
  const [tutor, hours] = await Promise.all([
    db.from('tutors').select('bio, languages, timezone').eq('id', tutorId).maybeSingle(),
    db.from('availability').select('id', { count: 'exact', head: true }).eq('tutor_id', tutorId),
  ])
  if (tutor.error || !tutor.data || hours.error || hours.count == null) return null
  return buildDirectorySetup({ availabilityRows: hours.count, bio: tutor.data.bio ?? null, languages: tutor.data.languages ?? null, timezone: tutor.data.timezone ?? null })
}

/** The Settings fields the buttons point at (`?focus=`): a fixed list, so an address cannot name anything else. */
export const SETTINGS_FOCUS_IDS = ['intro', 'languages'] as const
export type SettingsFocusId = (typeof SETTINGS_FOCUS_IDS)[number]
export const parseSettingsFocus = (v: unknown): SettingsFocusId | null => SETTINGS_FOCUS_IDS.find(id => id === v) ?? null
