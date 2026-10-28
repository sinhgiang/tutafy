// Which tutor profiles go into the sitemap and may be indexed: ONLY tutors who turned their public page on (Settings, "Booking page active" =
// tutors.booking_url_active) AND whose profile is worth listing (src/lib/profile-index.ts, T-1032: a real introduction, not a test account, not a copy of
// another profile of the same name). Five columns are read to decide (slug, name, introduction, photo address, creation time); only the slugs of the
// chosen profiles leave this file, so no name, email, phone or any other field goes to the sitemap.
// The read is made on the SERVER with the admin client (T-0774): a visitor's key cannot read the tutors table any more (the policy
// "Anyone can view tutor for booking", supabase/migrations/002_rls.sql, let it read every column). So what keeps a hidden profile out
// is the query itself, which asks for booking_url_active = true; tests/tutor-seo.test.ts runs it against a stand-in that answers
// every row when the filter is missing.
import { isPublicSlug } from '@/lib/tutor-seo'
import { pickIndexable, type IndexFacts } from '@/lib/profile-index'

/** The part of a Supabase client this file uses, so a test can pass a small fake. */
export interface TutorSlugClient {
  from(table: 'tutors'): {
    select(columns: typeof INDEX_COLUMNS): {
      eq(column: 'booking_url_active', value: true): {
        order(column: 'slug'): {
          limit(count: number): PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }>
        }
      }
    }
  }
}

/** What the rule needs to know about a tutor: the public name, introduction and photo, and when the profile was made. No contact or payment field. */
export const INDEX_COLUMNS = 'slug, name, bio, avatar_url, created_at' as const

/** A sitemap file may list 50,000 addresses; the static pages and posts take about 40 of them. */
export const MAX_TUTOR_URLS = 5000

/** The tutors whose page is on, as the rule sees them; null when the database is missing, fails or answers with an error. */
export async function listBookableTutors(client: TutorSlugClient | null): Promise<IndexFacts[] | null> {
  if (!client) return null
  try {
    const { data, error } = await client.from('tutors').select(INDEX_COLUMNS).eq('booking_url_active', true).order('slug').limit(MAX_TUTOR_URLS)
    if (error || !data) return null
    return data.filter((r): r is Record<string, unknown> & { slug: string } => isPublicSlug(r.slug))
  } catch {
    return null
  }
}

/** Slugs of the profiles offered to search engines. Any failure gives an empty list: the sitemap still serves its other pages. */
export async function listIndexableTutorSlugs(client: TutorSlugClient | null): Promise<string[]> {
  const rows = await listBookableTutors(client)
  return rows ? pickIndexable(rows).indexable : []
}
