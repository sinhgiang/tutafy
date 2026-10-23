// The student levels a tutor can say they teach (T-0863). Plain .ts with no imports, so Settings (a browser page), the directory and the node
// tests can all load it. Stored in tutors.levels_taught (migration 026) as the ids below; the database check says the same rule.

/** The three groups of student levels students think in, with the CEFR range as a hint. */
export const LEVEL_OPTIONS = [
  { id: 'beginner', label: 'Beginner', hint: 'A1 to A2' },
  { id: 'intermediate', label: 'Intermediate', hint: 'B1 to B2' },
  { id: 'advanced', label: 'Advanced', hint: 'C1 to C2' },
] as const
export type LevelId = (typeof LEVEL_OPTIONS)[number]['id']

/** The ids in a stored value, each once, in the order of LEVEL_OPTIONS; anything else (a typo, a made-up level, a non-array) is dropped. */
export function cleanLevels(raw: unknown): LevelId[] {
  const have = new Set(Array.isArray(raw) ? raw.map(v => (typeof v === 'string' ? v.trim().toLowerCase() : '')) : [])
  return LEVEL_OPTIONS.filter(o => have.has(o.id)).map(o => o.id)
}
