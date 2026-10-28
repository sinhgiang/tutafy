// Which tutor profiles search engines are asked to index (T-1032). A profile page exists for every tutor who turned the public page on, and on 28 Oct 2026
// that was 723 pages: 691 with no introduction at all, none with a photo, and about 655 with a name made of random letters. They all sat in the sitemap and
// were all "index, follow", which tells a search engine the site is mostly empty pages. The rule below is the one place that says which profiles are worth
// listing; the sitemap and the page's own `robots` tag both ask it, so they cannot disagree.
//
// A profile is indexable when ALL of these hold:
//   - it has a name (2 characters or more, the directory's own minimum);
//   - it has an introduction of at least MIN_INTRO_CHARS characters, the directory's own minimum (src/lib/directory.ts), so "a profile that may be listed
//     in the directory" and "a profile that may be listed in the sitemap" ask for the same thing;
//   - it is not a test account: the name or the address holds one of TEST_WORDS as a whole word (test, demo, sample ...);
//   - it is the best profile of its name: when several tutors share a name (compared without capitals and extra spaces) only one is kept, the one with
//     the longest introduction, then the one with a photo, then the oldest, then the first by address. The others stay reachable and bookable, they are
//     just not offered to search engines as copies of one another.
// Everything else is `noindex, follow` and out of the sitemap; nothing is deleted and nothing is hidden from the tutor or a student with the link.
// Plain .ts with no browser, React or database imports, so the node tests can load it.
import { MIN_INTRO_CHARS, MIN_NAME_CHARS } from '@/lib/directory'

export type IndexFacts = { slug: string; name?: unknown; bio?: unknown; avatar_url?: unknown; created_at?: unknown }
export type ExcludedReason = 'no-name' | 'short-intro' | 'test-account' | 'same-name'

const TEST_WORDS = /(?:^|[^\p{L}\p{N}])(?:test|testing|tester|demo|sample|dummy|fake|trial|lorem|asdf|qwerty)(?=$|[^\p{L}\p{N}])/iu

const chars = (v: unknown): number => (typeof v === 'string' ? Array.from(v.trim()).length : 0)

/** The name as compared for "the same name": no capitals, one space between words. */
export const nameKey = (name: unknown): string => (typeof name === 'string' ? name.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase() : '')

/** A test account by what it is called: a test word in the name or in the address (the address is the name plus random letters). */
export const isTestAccount = (f: Pick<IndexFacts, 'slug' | 'name'>): boolean => TEST_WORDS.test(typeof f.name === 'string' ? f.name : '') || TEST_WORDS.test(f.slug)

/** The rules that look at one profile alone; null when it passes them. */
export function ownReason(f: IndexFacts): ExcludedReason | null {
  if (chars(f.name) < MIN_NAME_CHARS) return 'no-name'
  if (isTestAccount(f)) return 'test-account'
  if (chars(f.bio) < MIN_INTRO_CHARS) return 'short-intro'
  return null
}

const timeOf = (v: unknown): number => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? Date.parse(v) : Number.MAX_SAFE_INTEGER)
const hasPhoto = (f: IndexFacts): boolean => typeof f.avatar_url === 'string' && /^https:\/\//.test(f.avatar_url)

/** Best first: the longest introduction, then a photo, then the oldest, then the address. */
function better(a: IndexFacts, b: IndexFacts): number {
  return chars(b.bio) - chars(a.bio) || Number(hasPhoto(b)) - Number(hasPhoto(a)) || timeOf(a.created_at) - timeOf(b.created_at) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
}

export type IndexChoice = { indexable: string[]; excluded: { slug: string; reason: ExcludedReason }[] }

/** From every tutor whose page is on: the addresses to offer to search engines, and why each of the others is left out. Order of `indexable` is by address. */
export function pickIndexable(rows: IndexFacts[]): IndexChoice {
  const excluded: IndexChoice['excluded'] = []
  const passing: IndexFacts[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    if (seen.has(r.slug)) continue
    seen.add(r.slug)
    const reason = ownReason(r)
    if (reason) excluded.push({ slug: r.slug, reason })
    else passing.push(r)
  }
  const byName = new Map<string, IndexFacts[]>()
  for (const r of passing) byName.set(nameKey(r.name), (byName.get(nameKey(r.name)) ?? []).concat(r))
  const indexable: string[] = []
  for (const group of byName.values()) {
    const [keeper, ...copies] = [...group].sort(better)
    indexable.push(keeper.slug)
    for (const c of copies) excluded.push({ slug: c.slug, reason: 'same-name' })
  }
  return { indexable: indexable.sort(), excluded }
}
