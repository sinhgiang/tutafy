// T-0693: a text must not say a pull request is waiting to be merged after GitHub has merged it.
//
// The mistake it stops (lock merged-pr-status-stale; the T-0620 and T-0680 reviews): the status file says "pull request #12 ...
// chờ gộp" (waiting to merge) or "chưa gộp" (not merged yet), but the owner already pressed Merge. The entry is written when the
// work is handed in and nobody reads it again after the merge.
//
// The rule: every pull request number written NEAR a waiting phrase must not be MERGED on GitHub.
//   - A waiting phrase: "chờ gộp", "chờ chủ gộp", "chưa gộp", "chưa được gộp", "chờ merge", "awaiting merge", "waiting to be merged",
//     "not (yet) merged" (any case).
//   - Near: on the same line, at most NEAR characters before or after the phrase.
//   - A pull request number: "#37", "pull request 37", "PR #37", "/pull/37".
//   - A number that has "đã gộp"/"is merged" written right next to it is the text saying it is merged: not stale, not asked.
// GitHub is asked read-only (`gh pr view <n> --json state`). When GitHub cannot be reached (no gh, not logged in, no network, a
// pull request that gh cannot find) the number is skipped and listed, never a failure: a check that fails offline would be turned off.
//
// Used by tests/pr-status.test.ts (in npm test: the fixtures with a pretend gh, and the Markdown files of the repository), by
// `npm run pr-status -- <file>` (any file: the project's status file in the Helme Brain is outside this repository) and by the pull
// request workflow (.github/workflows/pull-request.yml).
import { spawnSync } from 'node:child_process'
import { ROOT } from './line-refs.ts'

/** How many characters on either side of a waiting phrase a pull request number still counts as being "near" it. */
export const NEAR = 160

const WAITING = /ch(?:ờ|o)\s+(?:chủ\s+)?(?:được\s+)?(?:gộp|merge)|chưa\s+(?:được\s+)?(?:gộp|merge)|awaiting\s+merge|waiting\s+(?:to\s+be\s+)?merged?|not\s+(?:yet\s+)?merged/giu
const PR_NUMBER = /(?:\b(?:pull request|PR)\s*#?|#|\/pull\/)(\d{1,5})\b/giu
// "đã gộp" / "đã được gộp" / "gộp xong" / "is merged" next to the number: the text itself says it is done
const DONE = /đã\s+(?:được\s+)?(?:gộp|merge)|gộp\s+xong|\b(?:has been|was|is|got)\s+merged\b|đã\s+vào\s+(?:master|main)/iu

export type Mention = { pr: number; line: number; phrase: string }

/** The pull requests written near a waiting phrase, with the line of the text and the phrase. */
export function waitingMentionsIn(text: string): Mention[] {
  const out: Mention[] = []
  const seen = new Set<string>()
  const lines = text.split('\n')
  lines.forEach((lineText, i) => {
    const prs = [...lineText.matchAll(PR_NUMBER)].map(m => ({ pr: Number(m[1]), start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
    if (prs.length === 0) return
    for (const w of lineText.matchAll(WAITING)) {
      const at = w.index ?? 0
      for (const p of prs) {
        const distance = p.end < at ? at - p.end : p.start > at + w[0].length ? p.start - (at + w[0].length) : 0
        if (distance > NEAR) continue
        const around = lineText.slice(Math.max(0, p.start - 24), Math.min(lineText.length, p.end + 36))
        if (DONE.test(around)) continue // "#35 đã gộp" or "đã gộp #35": the text says so itself
        const key = `${i}:${p.pr}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ pr: p.pr, line: i + 1, phrase: w[0] })
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
