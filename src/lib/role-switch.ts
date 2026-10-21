// Switching between the tutor side and the student side for one person (T-0676).
//
// A person can be a tutor (a row in `tutors` with their account id) and, at the same time, a student of
// another tutor (rows in `students` with their email). The student side has no sign-in of its own: it is
// opened with a signed link for an email (src/lib/student-auth.ts), and the link is handed out only to the
// owner of that mailbox (an emailed link, or a Google login). The "View as student" button must not become
// a way around that, so:
//   - the email is always the SIGNED-IN account's own, read from the session on the server, never from the
//     request, so nobody can ask for someone else's lessons;
//   - it is used only when that account's email is proven to be theirs (verifiedEmail below);
//   - the button is shown, and the link made, only when that email really is a student of ANOTHER tutor.

export type SessionUser = {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
  confirmation_sent_at?: string | null
  identities?: { provider?: string; identity_data?: { email_verified?: boolean } | null }[] | null
}

/**
 * The account's email, only when it has been proven to belong to them:
 *  - a Google sign-in whose email Google verified, or
 *  - an email that was confirmed through a confirmation mail that was actually sent.
 * An account whose email was never checked (a project that confirms emails automatically has no
 * confirmation mail, so `confirmation_sent_at` is empty) gets nothing: anyone could have typed that address.
 */
export function verifiedEmail(user: SessionUser | null | undefined): string | null {
  const email = (user?.email ?? '').toLowerCase().trim()
  if (!user || !email) return null
  const google = (user.identities ?? []).some(i => i.provider === 'google' && i.identity_data?.email_verified !== false)
  if (google && user.email_confirmed_at) return email
  if (user.email_confirmed_at && user.confirmation_sent_at) return email
  return null
}

/** `%`, `_` and `\` mean something inside ilike; an address may contain `_`, which must match only itself. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, c => `\\${c}`)
}

type CountQuery = PromiseLike<{ count: number | null; error: unknown }>
type Db = { from(table: string): { select(columns: string, options: { count: 'exact'; head: true }): { ilike(column: string, pattern: string): { eq(column: string, value: string): { neq(column: string, value: string): CountQuery } } } } }

/** True when this email is an active student of at least one tutor other than the account itself. */
export async function isStudentOfAnotherTutor(db: unknown, email: string, accountId: string): Promise<boolean> {
  try {
    const { count, error } = await (db as Db)
      .from('students')
      .select('id', { count: 'exact', head: true })
      .ilike('email', escapeLike(email))
      .eq('status', 'active')
      .neq('tutor_id', accountId)
    return !error && (count ?? 0) > 0
  } catch {
    return false
  }
}

/** Show "View as student" to this signed-in person? Yes only for a verified email that is a student elsewhere. */
export async function canViewAsStudent(db: unknown, user: SessionUser | null | undefined): Promise<boolean> {
  const email = verifiedEmail(user)
  return email !== null && !!user && (await isStudentOfAnotherTutor(db, email, user.id))
}

type OwnRowQuery = { from(table: string): { select(columns: string): { eq(column: string, value: string): { maybeSingle(): PromiseLike<{ data: { id: string } | null; error: unknown }> } } } }

/**
 * Show "Back to tutor" on the student page? Only when the visitor is signed in as a tutor whose verified
 * email is the very email the student link was made for. A student who only holds a link, or anybody else,
 * sees nothing.
 */
export async function canBackToTutor(db: unknown, user: SessionUser | null | undefined, linkEmail: string): Promise<boolean> {
  const email = verifiedEmail(user)
  if (!email || !user || email !== linkEmail.toLowerCase().trim()) return false
  try {
    const { data } = await (db as OwnRowQuery).from('tutors').select('id').eq('id', user.id).maybeSingle()
    return data?.id === user.id
  } catch {
    return false
  }
}
