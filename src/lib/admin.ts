// The one place that says who the platform admin is. The proxy, the admin
// layout and every admin page that reads other people's data use it.
// Import-free so the node tests can load it.

export const ADMIN_EMAIL = 'tubxeebyajtube@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email === ADMIN_EMAIL
}

/** Where a visitor goes before reaching an admin page: nowhere (admin), the login page, or the tutor dashboard. */
export function adminGateTarget(user: { email?: string | null } | null | undefined): '/login' | '/dashboard' | null {
  if (!user) return '/login'
  return isAdminEmail(user.email) ? null : '/dashboard'
}
