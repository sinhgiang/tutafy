// The directory list, kept for a few minutes so one visitor's page does not cost a hundred reads (T-0769). A tutor who adds free hours
// appears within DIRECTORY_REVALIDATE_SECONDS. A failed read is NOT kept (it throws inside the cached function).
//
// T-1144: the page showed the red "We could not load the tutors" box once on the live site and left no trace, because the failure was caught
// and thrown away. So now (a) a failed read is tried once more after a short wait, since most failures are a hiccup of the database or of a
// cold server; (b) when the read still fails, the last list that was read well is shown for up to DIRECTORY_STALE_MAX_MS, so one bad moment does
// not turn a page of tutors into an error box; (c) every failed attempt is written to the log with the reason. Only when there is no good list
// at all does the caller get null and say "could not load" (never an empty list that looks like "no tutors").
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { loadDirectory, DirectoryReadError, type DirectoryClient, type DirectoryList } from '@/lib/directory-data'

export const DIRECTORY_REVALIDATE_SECONDS = 300
/** How long the last good list may stand in for a read that keeps failing. */
export const DIRECTORY_STALE_MAX_MS = 30 * 60 * 1000
/** The wait before the second try. */
export const DIRECTORY_RETRY_DELAY_MS = 250

const cached = unstable_cache(
  async (): Promise<DirectoryList> => loadDirectory(createAdminClient() as unknown as DirectoryClient),
  // v2 (T-1033): a card now carries `groups`. A new key means no copy cached by an earlier deploy, without that field, is ever read by this code.
  ['tutor-directory-v2'],
  { revalidate: DIRECTORY_REVALIDATE_SECONDS, tags: ['tutor-directory'] },
)

// The last list read well by this server instance (memory only; a new instance starts without one).
let lastGood: { list: DirectoryList; at: number } | null = null

/** For tests: forget the last good list. */
export function resetDirectoryFallback(): void {
  lastGood = null
}

/** What goes in the log for a failed read: the name of the failure and the tables or the reason, never a row. */
function reasonOf(e: unknown): string {
  if (e instanceof DirectoryReadError) return `${e.name}: ${e.tables.join(', ')}`
  return e instanceof Error ? `${e.name}: ${e.message}` : 'unknown failure'
}

/** The listed tutors, or null when the list could not be read and there is no good list to fall back on (a missing admin key counts). */
export async function getDirectory(): Promise<DirectoryList | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const list = await cached()
      lastGood = { list, at: Date.now() }
      return list
    } catch (e) {
      console.error(`[directory] the tutor list could not be read (try ${attempt} of 2): ${reasonOf(e)}`)
      if (attempt === 1) await new Promise(r => setTimeout(r, DIRECTORY_RETRY_DELAY_MS))
    }
  }
  if (lastGood && Date.now() - lastGood.at < DIRECTORY_STALE_MAX_MS) {
    console.error('[directory] showing the last good tutor list')
    return lastGood.list
  }
  return null
}
