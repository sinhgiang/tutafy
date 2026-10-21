// T-0693: a text must not say a pull request is waiting to be merged after GitHub has merged it.
//
// The mistake it stops (lock merged-pr-status-stale; the T-0620 and T-0680 reviews): the status file says "pull request #12 ...
// chờ gộp" (waiting to merge) or "chủ gộp pull request #12", but the owner already pressed Merge. The entry is written when the
// work is handed in and nobody reads it again after the merge.
//
// The rule: every pull request number that belongs to a waiting phrase must not be MERGED on GitHub.
//   - A waiting phrase: "chờ ... gộp" with up to five words between ("chờ gộp", "chờ chủ gộp", "chờ review rồi chủ gộp", and the list
//     forms "Việc chờ W-2067 (gộp #36)", "Việc chờ: W-2067 (gộp #36)", "Việc chờ của chủ: W-1918 (gộp #24)": a colon after "chờ", a
//     colon, comma or bracket inside, "gộp" after a bracket; a full stop or a semicolon between them ends the reach), "chủ gộp"
//     (the owner has to merge: "W-1844: chủ gộp pull request #1"; "chủ đã gộp" is not one), "chưa gộp", "chưa được gộp", "chờ merge",
//     "awaiting merge", "waiting to be merged", "not (yet) merged" (any case).
//   - A pull request number: "#37", "pull request 37", "PR #37", "/pull/37".
//   - It belongs to the phrase when it is on the same line, at most NEAR characters away; or, when the phrase has no number on its
//     line, the nearest number of the same ITEM (a list item "- T-xxxx ..." / "- W-xxxx ..." with its indented lines, up to
//     MAX_LINES lines away): "xong, chờ review rồi chủ gộp (W-1882)" with "pull request MỚI #17" on the next line.
//   - A number is the text saying it is merged, so not asked, when "đã gộp" / "đã được gộp" / "gộp xong" / "is merged" is written
//     next to it AND it is that number's own word: the word belongs to the nearest number on its line, so in
//     "PR #38 đã gộp, PR #39 chờ gộp" it is #38's and #39 is asked.
// GitHub is asked read-only (`gh pr view <n> --json state`). When GitHub cannot be reached (no gh, not logged in, no network, a
// pull request that gh cannot find) the number is skipped and listed, never a failure: a check that fails offline would be turned off.
//
// NOT caught: a waiting sentence in other words ("còn mở", "chưa vào master", "đợi duyệt"), a waiting word and "gộp" with a full stop,
// a semicolon or more than five words between them ("Việc chờ cho chủ: W-1909 (đọc kết quả rồi bấm Done; gộp #21 ...)"), a phrase with no pull request number in
// its item or more than MAX_LINES lines away, a number written without "#", "PR" or "pull request" in front, and a number whose
// state GitHub does not give. A pull request that is waiting in a sentence that also has another number is asked for both.
//
// Used by tests/pr-status.test.ts (in npm test: the fixtures with a pretend gh, and the Markdown files of the repository), by
// `npm run pr-status -- <file>` (any file: the project's status file in the Helme Brain is outside this repository) and by the pull
// request workflow (.github/workflows/pull-request.yml).
import { spawnSync } from 'node:child_process'
import { ROOT } from './line-refs.ts'

/** How many characters on either side of a waiting phrase a pull request number on the same line still belongs to it. */
export const NEAR = 160
/** How many lines away, inside one item, the nearest number may be when the phrase's own line has none. */
export const MAX_LINES = 5

const WAITING = new RegExp([
  // chờ gộp, chờ chủ gộp, chờ review rồi chủ gộp, and the way a list of waiting items is written: "Việc chờ W-2067 (gộp #36)",
  // "Việc chờ: W-2067 (gộp #36, kind do)", "Việc chờ của chủ: W-1918 (gộp #24)". After "chờ" a colon or comma may come; the words between
  // may carry a colon, a comma or an opening bracket; "gộp" may stand after a space or a bracket. A full stop or a semicolon ends the reach.
  "(?<![\\p{L}])ch(?:ờ|o)(?![\\p{L}])[:,]?(?:\\s+[^\\s.;]+){0,5}?[\\s(]+(?:chủ\\s+)?(?:được\\s+)?(?:gộp|merge)(?![\\p{L}])",
  'chủ\\s+(?:cần\\s+)?gộp(?![\\p{L}])', // chủ gộp pull request #1
  'chưa\\s+(?:được\\s+)?(?:gộp|merge)(?![\\p{L}])',
  'awaiting\\s+merge', 'waiting\\s+(?:to\\s+be\\s+)?merged?', 'not\\s+(?:yet\\s+)?merged',
].join('|'), 'giu')
const PR_NUMBER = /(?:\b(?:pull request|PR)\s*#?|#|\/pull\/)(\d{1,5})\b/giu
// "đã gộp" / "đã được gộp" / "gộp xong" / "is merged" next to the number: the text itself says it is done
const DONE = /đã\s+(?:được\s+)?(?:gộp|merge)|gộp\s+xong|\b(?:has been|was|is|got)\s+merged\b|đã\s+vào\s+(?:master|main)/giu
/** How far (characters) a "đã gộp" may be from the number it belongs to: after it, before it. */
const DONE_AFTER = 36
const DONE_BEFORE = 24

export type Mention = { pr: number; line: number; phrase: string }

type Pr = { pr: number; line: number; start: number; end: number }

/** Where each item of a text starts: a heading, a list marker in column 0, or (outside a list) a paragraph after a blank line. */
function itemStarts(lines: string[]): number[] {
  const starts: number[] = []
  let inList = false
  lines.forEach((l, i) => {
    const heading = /^#{1,6}\s/.test(l)
    const marker = /^(?:[-*]|\d+[.)])\s/.test(l)
    if (heading || marker) { starts.push(i); inList = marker; return }
    if (l.trim() !== '' && !inList && (i === 0 || lines[i - 1].trim() === '')) starts.push(i)
    else if (i === 0 && l.trim() !== '') starts.push(i)
  })
  return starts
}

/** The pull requests that belong to a waiting phrase, with the line of the phrase and the phrase. */
export function waitingMentionsIn(text: string): Mention[] {
  const out: Mention[] = []
  const seen = new Set<string>()
  const lines = text.split('\n')
  const starts = itemStarts(lines)
  starts.forEach((from, k) => {
    const to = k + 1 < starts.length ? starts[k + 1] : lines.length
    const prs: Pr[] = []
    const done = new Set<number>() // the numbers whose own "đã gộp" is written next to one of their mentions in this item
    for (let i = from; i < to; i++) {
      const here = [...lines[i].matchAll(PR_NUMBER)].map(m => ({ pr: Number(m[1]), line: i, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
      prs.push(...here)
      for (const d of lines[i].matchAll(DONE)) {
        const ds = d.index ?? 0
        const de = ds + d[0].length
        // the "đã gộp" belongs to the nearest number of its line, if that number is close enough
        let best: Pr | null = null
        let bestDistance = Infinity
        for (const p of here) {
          const distance = p.end <= ds ? ds - p.end : p.start >= de ? p.start - de : 0
          if (distance < bestDistance) { best = p; bestDistance = distance }
        }
        if (best && (best.end <= ds ? bestDistance <= DONE_AFTER : bestDistance <= DONE_BEFORE)) done.add(best.pr)
      }
    }
    if (prs.length === 0) return
    for (let i = from; i < to; i++) {
      for (const w of lines[i].matchAll(WAITING)) {
        const at = w.index ?? 0
        const wEnd = at + w[0].length
        const near = prs.filter(p => p.line === i && (p.end < at ? at - p.end : p.start > wEnd ? p.start - wEnd : 0) <= NEAR)
        let owned = near
        if (owned.length === 0) {
          // no number on the phrase's own line: the nearest number of the item, by lines and then by characters
          let best: Pr | null = null
          let bestKey = Infinity
          for (const p of prs) {
            const lineGap = Math.abs(p.line - i)
            if (p.line === i || lineGap > MAX_LINES) continue
            const key = lineGap * 100000 + (p.line > i ? p.start : lines[p.line].length - p.end)
            if (key < bestKey) { best = p; bestKey = key }
          }
          owned = best ? [best] : []
        }
        for (const p of owned) {
          if (done.has(p.pr)) continue // the item says, next to that number, that it is merged
          const key = `${i}:${p.pr}`
          if (seen.has(key)) continue
          seen.add(key)
          out.push({ pr: p.pr, line: i + 1, phrase: w[0] })
        }
      }
    }
  })
  return out
}

// ---- asking GitHub --------------------------------------------------------------------------------------------------

export type PrState = 'MERGED' | 'OPEN' | 'CLOSED' | 'UNKNOWN'
/** Gives the state of pull request n, or UNKNOWN when GitHub cannot say. May throw `GithubUnavailable` to stop asking. */
export type StateOf = (pr: number) => PrState

/** Thrown by a state reader when GitHub cannot be reached at all (so asking about the next number would fail the same way). */
export class GithubUnavailable extends Error {}

/** `owner/name` of the GitHub repository this clone pushes to, or null. */
export function repoSlug(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.GITHUB_REPOSITORY) return env.GITHUB_REPOSITORY
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, encoding: 'utf8' })
  const m = r.status === 0 ? /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\s*$/.exec(r.stdout) : null
  return m ? m[1] : null
}

/**
 * The state of a pull request from GitHub: `gh pr view <n> --repo <slug> --json state`, read-only. PR_STATUS_GH_SCRIPT names a
 * script that stands in for `gh` (run with node, given the same arguments): the tests use it, so no test touches the network.
 */
export function ghStateOf(slug: string, env: NodeJS.ProcessEnv = process.env): StateOf {
  return pr => {
    const args = ['pr', 'view', String(pr), '--repo', slug, '--json', 'state']
    const script = env.PR_STATUS_GH_SCRIPT
    const r = script
      ? spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 30000, env })
      : spawnSync('gh', args, { encoding: 'utf8', timeout: 30000, env })
    if (r.error || r.status === null) throw new GithubUnavailable(r.error ? r.error.message : 'gh did not answer')
    if (r.status !== 0) {
      const why = `${r.stderr}`.trim()
      if (/auth|login|GH_TOKEN|connect|network|timeout|rate limit|HTTP 4(?:01|03)|HTTP 5\d\d/i.test(why) && !/Could not resolve to a PullRequest/i.test(why)) throw new GithubUnavailable(why.split('\n')[0])
      return 'UNKNOWN'
    }
    try {
      const state = String(JSON.parse(r.stdout).state ?? '').toUpperCase()
      return state === 'MERGED' || state === 'OPEN' || state === 'CLOSED' ? state : 'UNKNOWN'
    } catch {
      return 'UNKNOWN'
    }
  }
}

// ---- the check ------------------------------------------------------------------------------------------------------

export type PrReport = { problems: string[]; asked: number[]; skipped: string[] }

/** A pull request near a waiting phrase that GitHub says is MERGED is a problem. Stops asking when GitHub cannot be reached. */
export function mergedWaitingReport(text: string, label: string, stateOf: StateOf): PrReport {
  const problems: string[] = []
  const asked: number[] = []
  const skipped: string[] = []
  const states = new Map<number, PrState>()
  let unavailable: string | null = null
  for (const m of waitingMentionsIn(text)) {
    if (unavailable) { skipped.push(`${label}:${m.line}: #${m.pr} (not asked: ${unavailable})`); continue }
    if (!states.has(m.pr)) {
      try { states.set(m.pr, stateOf(m.pr)); asked.push(m.pr) } catch (e) {
        if (!(e instanceof GithubUnavailable)) throw e
        unavailable = e.message || 'GitHub cannot be reached'
        skipped.push(`${label}:${m.line}: #${m.pr} (not asked: ${unavailable})`)
        continue
      }
    }
    const state = states.get(m.pr)!
    if (state === 'MERGED') problems.push(`${label}:${m.line}: pull request #${m.pr} is MERGED on GitHub but the text still says "${m.phrase}" near it`)
    else if (state === 'UNKNOWN') skipped.push(`${label}:${m.line}: #${m.pr} (GitHub did not say)`)
  }
  return { problems, asked, skipped }
}
