// The languages a tutor says they teach (T-1032). The column tutors.languages has been in the schema from the start and every public page reads it (directory,
// profile, booking page, language pages, search markup), but until now nothing in the app wrote it, so no tutor could ever show a language. Settings, Profile
// has the field now (src/components/settings/LanguagesField.tsx); this file is the one rule for what is accepted, used in the browser and again on the server
// (/api/tutors/languages). Plain .ts with no imports that need a browser, so the node tests can load it.
import { cleanLanguage } from '@/lib/directory'

/** At most this many languages on a profile (the directory and the profile show up to six). */
export const MAX_LANGUAGES = 6

export const LANGUAGES_HELP = 'Separate the languages with commas, for example English, Spanish. Up to six. They show on your profile and in the tutor directory.'

// A language name: letters (any alphabet), marks, spaces, hyphen, apostrophe and full stop, 30 characters at most. No digits, no address, no markup.
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]{0,29}$/u

export type ParsedLanguages = { ok: true; languages: string[] } | { ok: false; error: string }

/** What a tutor typed ("english, Spanish ; french"), or what an address sent as a list, to the clean list stored in the column. An empty text is an empty list. */
export function parseLanguages(input: unknown): ParsedLanguages {
  if (!Array.isArray(input) && typeof input !== 'string') return { ok: false, error: 'Type the languages you teach, separated by commas.' }
  const parts: unknown[] = Array.isArray(input) ? input : input.split(/[,;\n]+/)
  const out: string[] = []
  for (const raw of parts) {
    if (typeof raw !== 'string') return { ok: false, error: 'Type the languages you teach, separated by commas.' }
    if (raw.trim() === '') continue
    const name = cleanLanguage(raw)
    if (!NAME.test(name)) return { ok: false, error: `“${raw.trim().slice(0, 30)}” is not a language name. Use names such as English or Brazilian Portuguese.` }
    if (!out.some(o => o.toLowerCase() === name.toLowerCase())) out.push(name)
  }
  if (out.length > MAX_LANGUAGES) return { ok: false, error: `Choose up to ${MAX_LANGUAGES} languages.` }
  return { ok: true, languages: out }
}

/** The list as the box shows it. */
export const languagesToText = (languages: readonly string[]): string => languages.join(', ')
