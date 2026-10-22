// A check for one mistake the Reviewer caught twice (key absolute-comment-claim, T-0703 and T-0724): a comment or a document says a filter blocks "all" made-up
// or example addresses, but the regular expression blocks only some endings, and a test even says another example ending (like `.example`) can be mailed.
//
// What this file does, with no imports from the app so the node tests can run it on any text:
//   1. finds every address filter in the code: a `const NAME = /@.../` pattern about made-up endings (example, test, invalid, local, localhost);
//   2. PROBES the real pattern with the realistic endings in PROBES, so what it blocks is measured, not read from a comment;
//   3. requires the comment above it to list the endings, in two lists: "Blocked: ..." and "Not blocked: ...", and compares them with the probe;
//   4. refuses a comment or a document line that uses an absolute word ("all", "every", "any") with a blocking word about made-up addresses
//      unless it points at the list (`TEST_DOMAIN`, or the lists themselves).
// A comment with no list is the mistake: nothing can be compared, so it is refused. Nothing here changes what the app sends.

/** Endings people really type or tools really make, as the part after the @ of a test address. Each is probed as `x@mail.<ending>` (a bare name as `x@<name>`). */
export const PROBES = ['example.com', 'example.org', 'example.net', '.test', '.invalid', '.localhost', '.example', '.local'] as const
const probeAddress = (p: string) => (p.startsWith('.') ? `x@mail${p}` : `x@mail.${p}`)

export type AddressFilter = { name: string; file: string; pattern: RegExp; comment: string }

const ABOUT_MADE_UP_ENDINGS = /example|test|invalid|local/i

/** Every `const NAME = /@.../flags` of a source text that is about made-up endings, with the comment lines right above it. */
export function findAddressFilters(text: string, file: string): AddressFilter[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const out: AddressFilter[] = []
  lines.forEach((line, i) => {
    const m = /^\s*(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\/(.+)\/([a-z]*)\s*$/.exec(line)
    if (!m || !m[2].includes('@') || !ABOUT_MADE_UP_ENDINGS.test(m[2])) return
    let pattern: RegExp
    try { pattern = new RegExp(m[2], m[3]) } catch { return }
    const above: string[] = []
    for (let j = i - 1; j >= 0 && /^\s*(\/\/|\/\*|\*)/.test(lines[j]); j--) above.unshift(lines[j])
    out.push({ name: m[1], file, pattern, comment: above.join('\n') })
  })
  return out
}

/** Which probes the pattern really blocks. */
export function blockedEndings(pattern: RegExp): string[] {
  return PROBES.filter(p => pattern.test(probeAddress(p)))
}

/** The list after "Blocked:" or "Not blocked:" at the start of a comment line, or null when the comment has no such line. */
const parseList = (comment: string, label: 'Blocked' | 'Not blocked'): string[] | null => {
  for (const raw of comment.split('\n')) {
    const line = raw.replace(/^\s*(\/\*\*?|\*\/|\*|\/\/)\s?/, '').trim()
    if (line.startsWith(label + ':')) return line.slice(label.length + 1).replace(/[.\s]+$/, '').split(/[,;]\s*/).map(x => x.trim()).filter(Boolean)
  }
  return null
}
const norm = (s: string) => s.trim().replace(/^[`*]+|[`*]+$/g, '')

export function filterProblems(f: AddressFilter): string[] {
  const blocked = blockedEndings(f.pattern)
  const claimedBlocked = parseList(f.comment, 'Blocked')
  const claimedNot = parseList(f.comment, 'Not blocked')
  const where = `${f.file} ${f.name}`
  if (!claimedBlocked) return [`${where}: the comment does not list the endings the pattern blocks ("Blocked: ..."), so a claim like "made-up addresses are never mailed" cannot be checked; it blocks ${blocked.join(', ') || 'none of the probes'}`]
  const problems: string[] = []
  const cb = new Set(claimedBlocked.map(norm))
  const cn = new Set((claimedNot ?? []).map(norm))
  for (const p of PROBES) {
    const isBlocked = blocked.includes(p)
    if (isBlocked && !cb.has(p)) problems.push(`${where}: the pattern blocks ${p} but the comment does not say so`)
    if (!isBlocked && cb.has(p)) problems.push(`${where}: the comment says ${p} is blocked but the pattern lets it through`)
    if (!isBlocked && !cn.has(p)) problems.push(`${where}: the pattern lets ${p} through but the comment does not say "Not blocked: ${p}"`)
    if (isBlocked && cn.has(p)) problems.push(`${where}: the comment says ${p} is not blocked but the pattern blocks it`)
  }
  for (const c of [...cb, ...cn]) if (!(PROBES as readonly string[]).includes(c)) problems.push(`${where}: the comment names ${c}, which no probe tests (add it to PROBES in tests/support/address-claims.ts)`)
  return problems
}

// ---- absolute words in comments and documents -------------------------------------------------------------------------------------

const ABSOLUTE = /\b(all|every|any)\b/i
const MADE_UP_ADDRESS = /(made[- ]up|fake|example|test|dummy|placeholder)\b[^.\n]{0,40}\b(addresses|address|domains|domain|emails?)\b/i
const BLOCKING = /\b(block(?:s|ed|ing)?|filter(?:s|ed|ing)?|refus(?:e|es|ed)|reject(?:s|ed)?|skip(?:s|ped)?|never (?:mailed|sent|emailed)|not (?:mailed|sent))\b/i
/** A line that points at the list is not an unchecked claim. */
const POINTS_AT_LIST = /TEST_DOMAIN|Blocked:|Not blocked:/

/** Comment lines of a source file, or the lines of a Markdown file, that claim a filter covers ALL made-up addresses without pointing at the list. */
export function absoluteClaimLines(text: string, file: string): { file: string; line: number; text: string }[] {
  const isCode = /\.(ts|tsx|mjs|js)$/.test(file)
  const out: { file: string; line: number; text: string }[] = []
  text.replace(/\r\n/g, '\n').split('\n').forEach((raw, i) => {
    if (isCode && !/^\s*(\/\/|\/\*|\*)|\/\/ |\/\*\*/.test(raw)) return
    if (ABSOLUTE.test(raw) && MADE_UP_ADDRESS.test(raw) && BLOCKING.test(raw) && !POINTS_AT_LIST.test(raw)) out.push({ file, line: i + 1, text: raw.trim() })
  })
  return out
}

/**
 * A line of a document that says made-up addresses are never mailed (or are skipped, blocked ...) and names some endings, must name them all
 * (the blocked ones) or point at TEST_DOMAIN, because a shorter list reads as "the others are fine" and a vaguer one as "all of them".
 */
export function docLineProblems(text: string, file: string, blocked: string[]): string[] {
  const out: string[] = []
  text.replace(/\r\n/g, '\n').split('\n').forEach((raw, i) => {
    const claim = /(made[- ]up|fake)\b[^\n]{0,40}\baddress/i.test(raw) && /\b(never|not) (mailed|sent|emailed)\b|\b(left out|skipped|skips|blocked|blocks|filtered|filters|refused|refuses)\b|\bnot an? (made[- ]up|fake)/i.test(raw)
    if (!claim || POINTS_AT_LIST.test(raw)) return
    const missing = blocked.filter(b => !raw.includes(b))
    if (missing.length > 0) out.push(`${file}:${i + 1}: says made-up addresses are left out but does not name ${missing.join(', ')} (name them all, or point at TEST_DOMAIN)`)
  })
  return out
}
