// The source text of the Settings page as a reader sees it (T-0844): the page itself, then its six sections in the order the tabs are
// listed. The page used to hold all of it in one file; the tests that look for a word, a link or a rule in "the Settings page" read
// this, so they follow the code to where it moved. Line ends are made LF, like the other readers in the tests.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const SETTINGS_SECTION_FILES = ['Profile', 'Booking', 'Payments', 'Extras', 'Integrations', 'Plan'].map(n => `src/components/settings/sections/${n}Section.tsx`)
export const SETTINGS_FILES = ['src/app/(dashboard)/settings/page.tsx', ...SETTINGS_SECTION_FILES]

export function settingsSource(): string {
  return SETTINGS_FILES.map(f => readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n')).join('\n')
}
