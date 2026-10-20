// Small display helpers for the owner's pages. No imports, so the node tests can load them.

/** "Germany (DE)" from a two-letter code; a missing or odd code is shown as a dash or as it is. */
export function countryName(code: string | null | undefined): string {
  if (!code) return '—'
  try {
    return `${new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code} (${code})`
  } catch {
    return code
  }
}

/** A moment as "2026-10-12 08:01" in UTC, whatever form the database used. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '—' : new Date(t).toISOString().slice(0, 16).replace('T', ' ')
}

/** A day as "2026-10-12". */
export function formatDay(iso: string | null | undefined): string {
  return formatWhen(iso).slice(0, 10)
}
