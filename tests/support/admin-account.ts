// The admin account the tests sign in as. The app reads it from the ADMIN_EMAIL variable (src/lib/admin.ts) and no real address is
// written anywhere in the repository (rule 4b, T-0908), so the tests set a made-up one here; a test that imports this file gets it set.
export const ADMIN_EMAIL = 'admin@example.com'
process.env.ADMIN_EMAIL = ADMIN_EMAIL
