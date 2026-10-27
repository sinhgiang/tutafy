// What the Ctrl or Cmd K command bar offers and how it filters. Pure, so tests can run it.
// Every page of the menu (nav-items.ts) is a command, so a page added there is reachable from the bar too.
import { NAV } from '@/components/layout/nav-items'

export type CommandKind = 'page' | 'action'
export type CommandItem = {
  id: string
  kind: CommandKind
  label: string
  /** Where it goes; an action without an address does something on the page (copy, switch theme). */
  href?: string
  /** Extra words that also find it ("new" finds "Schedule a lesson"). */
  words: string
}

export type CommandAction = 'copy-booking-link' | 'toggle-theme'

/** The actions, in the order shown. Three go to a page, two act on the page. */
export function commandItems(opts: { slug?: string | null } = {}): CommandItem[] {
  const pages: CommandItem[] = NAV.flatMap(g => g.items.map(i => ({
    id: `page:${i.href}`, kind: 'page' as const, label: i.label, href: i.href, words: `${g.group} go open`,
  })))
  const actions: CommandItem[] = [
    { id: 'action:new-lesson', kind: 'action', label: 'Schedule a lesson', href: '/lessons/new', words: 'new add book create' },
    { id: 'action:new-student', kind: 'action', label: 'Add a student', href: '/students/new', words: 'new create invite' },
    { id: 'action:edit-hours', kind: 'action', label: 'Change my free hours', href: '/availability', words: 'availability time hours' },
    ...(opts.slug ? [{ id: 'action:copy-booking-link', kind: 'action' as const, label: 'Copy my booking link', words: 'share url page' }] : []),
    { id: 'action:toggle-theme', kind: 'action', label: 'Switch light or dark theme', words: 'dark mode appearance' },
  ]
  return [...actions, ...pages]
}

/** Items that match every word typed, best first (label starts with the word, then label contains it, then the extra words). */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return items
  const scored: { item: CommandItem; score: number }[] = []
  for (const item of items) {
    const label = item.label.toLowerCase()
    const haystack = `${label} ${item.words}`
    if (!terms.every(t => haystack.includes(t))) continue
    let score = 0
    for (const t of terms) score += label.startsWith(t) ? 0 : label.includes(t) ? 1 : 2
    scored.push({ item, score })
  }
  return scored.sort((a, b) => a.score - b.score).map(s => s.item)
}

/** True for Ctrl K (Windows, Linux) and Cmd K (Mac), whatever the letter case. */
export function isCommandShortcut(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey?: boolean; shiftKey?: boolean }): boolean {
  return e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey
}

/** The address of the tutor's public booking page, for "Copy my booking link". */
export function bookingLink(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, '')}/book/${slug}`
}
