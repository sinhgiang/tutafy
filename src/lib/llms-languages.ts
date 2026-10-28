// Text for /llms-languages.txt (T-0875): the language pages that exist right now, in the same plain Markdown as /llms.txt. It is built from
// pickLanguagePages(), the function the pages and the sitemap use, so a language without enough tutors is not listed and cannot be linked.
// Tutors are named only by what their public card carries (name, the profile address): never an email, a phone number or a payment field.
import { SITE_URL, SITE_NAME } from '@/lib/site-content'
import { absoluteUrl } from '@/lib/site-url'
import { languagePagePath, tutorsOf, type NichePage, NICHE_MIN_TUTORS } from '@/lib/language-pages'
import type { DirectoryCard } from '@/lib/directory'
import { PAIR_MIN_TUTORS, groupLabelOf, pairGuidePath, tutorsOfPair, type PairPage } from '@/lib/niche-pages'

export function buildLlmsLanguagesTxt(pages: NichePage[], cards: DirectoryCard[], asOf: string | null, pairs: PairPage[] = []): string {
  const lines = [
    `# ${SITE_NAME}: language guides`,
    '',
    `> One guide for each language that at least ${NICHE_MIN_TUTORS} tutors who can be booked today teach. Each page lists those tutors, explains how to choose one and answers the questions people ask. Main site: ${SITE_URL}.`,
    '',
  ]
  if (pages.length === 0) {
    lines.push('There is no language guide right now: no language has enough tutors with open times yet. The tutor list is at ' + absoluteUrl('/tutors') + '.', '')
    return lines.join('\n')
  }
  if (asOf) lines.push(`Tutor lists read on ${asOf.slice(0, 10)}.`, '')
  lines.push('## Guides', '')
  for (const p of pages) lines.push(`- [${p.guide.name} tutors](${absoluteUrl(languagePagePath(p.guide.slug))}): ${p.guide.description} ${p.count} tutors can be booked today.`)
  lines.push('')
  for (const p of pages) {
    lines.push(`## ${p.guide.name}`, '', p.guide.answer, '')
    for (const c of tutorsOf(cards, p.guide).slice(0, 12)) lines.push(`- [${c.name}](${absoluteUrl(`/tutors/${c.slug}`)})`)
    lines.push('')
  }
  if (pairs.length > 0) {
    lines.push('## Guides for a specific reason', '', `One guide for each language and reason that at least ${PAIR_MIN_TUTORS} tutors who can be booked today teach and have ticked.`, '')
    for (const p of pairs) {
      lines.push(`- [${p.guide.language} for ${groupLabelOf(p.guide.group).toLowerCase()}](${absoluteUrl(pairGuidePath(p.guide))}): ${p.guide.description} ${p.count} tutors can be booked today.`)
      for (const c of tutorsOfPair(cards, p.guide).slice(0, 12)) lines.push(`  - [${c.name}](${absoluteUrl(`/tutors/${c.slug}`)})`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
