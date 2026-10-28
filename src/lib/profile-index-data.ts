// The profiles search engines may index, for a PROFILE PAGE to ask (T-1032). The sitemap reads the same tutors with the same rule
// (src/lib/tutor-sitemap.ts, src/lib/profile-index.ts), so a page that says "index" is in the sitemap and a page that says "noindex" is not.
// The list is read on the server with the admin client and kept for an hour: one read for every profile drawn in that hour, not one each.
// A read that fails is NOT kept (it throws inside the cached function) and is answered as null: the page then falls back to the rules that look
// at its own row only (introduction, name, test words), and leaves out only the "same name" rule, which needs the others.
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { listBookableTutors, type TutorSlugClient } from '@/lib/tutor-sitemap'
import { pickIndexable } from '@/lib/profile-index'

export const PROFILE_INDEX_REVALIDATE_SECONDS = 3600

const cached = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await listBookableTutors(createAdminClient() as unknown as TutorSlugClient)
    if (!rows) throw new Error('The tutor list could not be read')
    return pickIndexable(rows).indexable
  },
  ['profile-index-v1'],
  { revalidate: PROFILE_INDEX_REVALIDATE_SECONDS, tags: ['profile-index'] },
)

/** The addresses of the indexable profiles, or null when the list could not be read. */
export async function getIndexableSlugs(): Promise<Set<string> | null> {
  try {
    return new Set(await cached())
  } catch {
    return null
  }
}
