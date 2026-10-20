// Which tutor profiles go into the sitemap: ONLY tutors who turned their public page on
// (Settings, "Booking page active" = tutors.booking_url_active). One column is read, the
// slug; no name, email, phone or any other field leaves the database for the sitemap.
// Two things keep a hidden profile out, so a mistake in one does not list it:
//   - the query asks for booking_url_active = true;
//   - the database policy "Anyone can view tutor for booking" (supabase/migrations/002_rls.sql)
//     only lets the public (anon) key read rows where booking_url_active is true.
import { isPublicSlug } from '@/lib/tutor-seo'

/** The part of a Supabase client this file uses, so a test can pass a small fake. */
export interface TutorSlugClient {
  from(table: 'tutors'): {
    select(columns: 'slug'): {
      eq(column: 'booking_url_active', value: true): {
        order(column: 'slug'): {
          limit(count: number): PromiseLike<{ data: { slug: unknown }[] | null; error: unknown }>
        }
      }
    }
  }
}

/** A sitemap file may list 50,000 addresses; the static pages and posts take about 40 of them. */
export const MAX_TUTOR_URLS = 5000

/** Slugs of the public profiles. Any failure gives an empty list: the sitemap still serves its other pages. */
export async function listPublicTutorSlugs(client: TutorSlugClient | null): Promise<string[]> {
  if (!client) return []
  try {
    const { data, error } = await client.from('tutors').select('slug').eq('booking_url_active', true).order('slug').limit(MAX_TUTOR_URLS)
    if (error || !data) return []
    const slugs = data.map(r => r.slug).filter(isPublicSlug)
    return [...new Set(slugs)]
  } catch {
    return []
  }
}
