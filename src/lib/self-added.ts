// A student whose email is the tutor's own (T-0680). Most such students are made by a tutor who opens their
// own booking page (it pre-fills the signed-in email) and books it, so they are the tutor, not a customer.
// One rule for every page that counts students: the admin Overview and the tutor's "Get your first student" card.
// No imports, so the node tests can load it.

export function normEmail(e: string | null | undefined): string {
  return (e ?? '').trim().toLowerCase()
}

/** True when the student's email is the tutor's own, in any letter case or spacing. No email never counts. */
export function isSelfAdded(studentEmail: string | null | undefined, tutorEmail: string | null | undefined): boolean {
  const s = normEmail(studentEmail)
  return s !== '' && s === normEmail(tutorEmail)
}
