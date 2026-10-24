// The one place that says who the platform admin is. The proxy, the admin
// layout and every admin page that reads other people's data use it.
// Import-free so the node tests can load it.
//
// The admin account is the server variable ADMIN_EMAIL, not a value written in the code (rule 4b: no personal address on GitHub).
// It is read at the moment of each check. Fail closed: without the variable, or with a value that is not a plain address,
// nobody is the admin, so an unset variable can lock the owner out of /admin but can never open it to anyone else.

type Env = Record<string, string | undefined>

const PLAIN_ADDRESS = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

/** The admin sign-in address from ADMIN_EMAIL, or null when it is missing or not a plain address. */
export function adminEmail(env: Env = process.env): string | null {
  const v = (env.ADMIN_EMAIL ?? '').trim()
  return PLAIN_ADDRESS.test(v) ? v : null
}

export function isAdminEmail(email: string | null | undefined, env: Env = process.env): boolean {
  const admin = adminEmail(env)
  return admin !== null && typeof email === 'string' && email === admin
}

/** Where a visitor goes before reaching an admin page: nowhere (admin), the login page, or the tutor dashboard. */
export function adminGateTarget(user: { email?: string | null } | null | undefined, env: Env = process.env): '/login' | '/dashboard' | null {
  if (!user) return '/login'
  return isAdminEmail(user.email, env) ? null : '/dashboard'
}
