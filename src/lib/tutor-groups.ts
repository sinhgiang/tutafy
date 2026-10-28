// The kinds of student a tutor says they like to teach (T-1033, "Learning for"). Plain .ts with no imports, so Settings (a browser page), the
// directory and the node tests can all load it. Stored in tutors.learning_groups (migration 029) as the ids below; the database check says the same rule.

/** The six groups students think in. `slug` is the last part of a niche page address (/learn/english/working-professionals). */
export const GROUP_OPTIONS = [
  { id: 'work', label: 'Work and career', hint: 'meetings, emails, interviews', slug: 'working-professionals' },
  { id: 'exams', label: 'Exams', hint: 'IELTS, TOEFL, DELE and others', slug: 'exam-preparation' },
  { id: 'kids', label: 'Kids and teens', hint: 'school age', slug: 'kids-and-teens' },
  { id: 'travel', label: 'Travel', hint: 'getting by abroad', slug: 'travel' },
  { id: 'university', label: 'University', hint: 'study abroad, essays, lectures', slug: 'university' },
  { id: 'conversation', label: 'Conversation', hint: 'speaking with confidence', slug: 'conversation' },
] as const
export type GroupId = (typeof GROUP_OPTIONS)[number]['id']

/** The ids in a stored value, each once, in the order of GROUP_OPTIONS; anything else (a typo, a made-up group, a non-array) is dropped. */
export function cleanGroups(raw: unknown): GroupId[] {
  const have = new Set(Array.isArray(raw) ? raw.map(v => (typeof v === 'string' ? v.trim().toLowerCase() : '')) : [])
  return GROUP_OPTIONS.filter(o => have.has(o.id)).map(o => o.id)
}

/** The group for the last part of a niche address, or null. */
export const groupOfSlug = (slug: string): GroupId | null => GROUP_OPTIONS.find(o => o.slug === slug)?.id ?? null
