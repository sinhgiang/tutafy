// What the referral page may show about a tutor someone invited (T-0826): a short name, the month they joined and whether they pay.
// Never an email, an id or the full name.

export type ReferredRow = { name: string; joined: string; paid: boolean }

/** "Anna Maria Lopez" becomes "Anna L."; a one-word name stays as it is; an empty name is "A new tutor". */
export function shortName(full: string | null | undefined): string {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'A new tutor'
  if (parts.length === 1) return parts[0].slice(0, 20)
  return `${parts[0].slice(0, 20)} ${parts[parts.length - 1][0].toUpperCase()}.`
}

export function referredRow(t: { name: string | null; created_at: string; subscription_status: string | null }): ReferredRow {
  return { name: shortName(t.name), joined: t.created_at, paid: t.subscription_status === 'pro' || t.subscription_status === 'academy' }
}
