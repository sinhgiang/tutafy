// The name of the page shown in the top bar of the tutor app, worked out from the address.
// The menu (nav-items.ts) is the source: a page added there gets its name here without a second list.
// Pages that are not in the menu are listed in EXTRA_TITLES. Detail and form pages (/students/<id>,
// /lessons/new) take the name of the menu page they belong to.
import { NAV } from '@/components/layout/nav-items'

/** Tutor pages that are reached from a button or a link and are not in the menu. */
export const EXTRA_TITLES: Record<string, string> = {
  '/upgrade': 'Upgrade',
  // Payments and Reports became one page (T-0821); the old addresses redirect to it.
  '/payments': 'Earnings',
  '/reports': 'Earnings',
}

const ENTRIES: [string, string][] = [
  ...NAV.flatMap(g => g.items.map(i => [i.href, i.label] as [string, string])),
  ...Object.entries(EXTRA_TITLES),
]

/** The first part of the address with its slash: '/students/12/edit' gives '/students'. */
function segmentOf(pathname: string): string {
  return '/' + (pathname.split('?')[0].split('/')[1] ?? '')
}

/** The page name for an address; null when the address is not a tutor page. */
export function pageTitleOf(pathname: string): string | null {
  const segment = segmentOf(pathname)
  return ENTRIES.find(([href]) => href === segment)?.[1] ?? null
}

/** True for an address that belongs to the tutor app (the menu pages and the extra ones). */
export function isDashboardPath(pathname: string): boolean {
  return pageTitleOf(pathname) !== null
}
