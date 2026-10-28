// The directory list, kept for a few minutes so one visitor's page does not cost a hundred reads (T-0769). A tutor who adds free hours
// appears within DIRECTORY_REVALIDATE_SECONDS. A failed read is NOT kept (it throws inside the cached function) and is answered as null,
// so the page and the route say "could not load" rather than showing an empty list.
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { loadDirectory, type DirectoryClient, type DirectoryList } from '@/lib/directory-data'

export const DIRECTORY_REVALIDATE_SECONDS = 300

const cached = unstable_cache(
  async (): Promise<DirectoryList> => loadDirectory(createAdminClient() as unknown as DirectoryClient),
  // v2 (T-1033): a card now carries `groups`. A new key means no copy cached by an earlier deploy, without that field, is ever read by this code.
  ['tutor-directory-v2'],
  { revalidate: DIRECTORY_REVALIDATE_SECONDS, tags: ['tutor-directory'] },
)

/** The listed tutors, or null when the list could not be read (a missing admin key counts). */
export async function getDirectory(): Promise<DirectoryList | null> {
  try {
    return await cached()
  } catch {
    return null
  }
}
