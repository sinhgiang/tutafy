import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createLimiter } from '@/lib/rate-limit-memory'

function generateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NEW_ACCOUNT_MAX_AGE_MS = 15 * 60 * 1000 // an account that is not yet a tutor may only be set up within 15 minutes of signing up

// Limits live in this server instance's memory. The per-account key is a REAL account id (checked
// below), never a value the caller can make up; the overall one caps the lookups an unknown caller can cause.
const perAccount = createLimiter({ max: 5, windowMs: 10 * 60 * 1000 })
const overall = createLimiter({ max: 120, windowMs: 60 * 1000 })

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const cleanName = (s: unknown) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80) : '')

const FORBIDDEN = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// Creates the tutor profile for an account that has just signed up.
//
// Who the profile is for is NEVER taken from the request body on trust:
//   - signed in (a session cookie): the account is the session's; a body userId naming anyone else is refused;
//   - no session yet (email confirmation is pending): the body names the account, but it must exist, have been
//     created in the last 15 minutes, and carry the same email, which is checked with the service role.
// The email and name saved come from that account, not from the body. An existing profile is never overwritten.
export async function POST(request: NextRequest) {
  let body: { userId?: unknown; email?: unknown; name?: unknown; refCode?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const bodyUserId = typeof body.userId === 'string' ? body.userId : ''
  const bodyEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!bodyEmail || !cleanName(body.name)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (!overall.hit('all')) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const admin = createAdminClient()

  let accountId: string
  let accountEmail: string
  let accountName = cleanName(body.name)

  const { data: { user: sessionUser } } = await (await createClient()).auth.getUser()
  if (sessionUser) {
    if (bodyUserId && bodyUserId !== sessionUser.id) return FORBIDDEN()
    accountId = sessionUser.id
    accountEmail = (sessionUser.email ?? '').toLowerCase()
  } else {
    if (!UUID.test(bodyUserId)) return FORBIDDEN()
    const { data } = await admin.auth.admin.getUserById(bodyUserId)
    const account = data?.user
    const age = account?.created_at ? Date.now() - Date.parse(account.created_at) : Number.POSITIVE_INFINITY
    if (!account || age < 0 || age > NEW_ACCOUNT_MAX_AGE_MS) return FORBIDDEN()
    if ((account.email ?? '').toLowerCase() !== bodyEmail) return FORBIDDEN()
    accountId = account.id
    accountEmail = (account.email ?? '').toLowerCase()
    accountName = cleanName(account.user_metadata?.name) || accountName
  }
  if (!accountEmail) return FORBIDDEN()

  if (!perAccount.hit(accountId)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  // Already a tutor: nothing to do (and nothing to overwrite).
  const { data: existing } = await admin.from('tutors').select('id').eq('id', accountId).maybeSingle()
  if (existing) return NextResponse.json({ ok: true })

  // Resolve referral code to referrer's UUID (refCode = referrer's slug)
  let referredBy: string | null = null
  const refCode = typeof body.refCode === 'string' ? body.refCode.trim().slice(0, 60) : ''
  if (refCode) {
    const { data: referrer } = await admin.from('tutors').select('id').eq('slug', refCode).maybeSingle()
    if (referrer) referredBy = referrer.id
  }

  const slug = generateSlug(accountName)
  const { error } = await admin.from('tutors').insert({
    id: accountId,
    email: accountEmail,
    name: accountName,
    slug,
    ...(referredBy ? { referred_by: referredBy } : {}),
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }

  const safeName = escapeHtml(accountName)
  const email = accountEmail

  // The welcome mail. While the welcome series is off (the default) this is the mail that has always gone out (`legacy`);
  // once the owner switches the series on, sendWelcomeAtSignup sends the new day-0 mail instead of it (src/lib/welcome-send.ts).
  const apiKey = process.env.RESEND_API_KEY
  const sendLegacyWelcome = async () => {
      const { createMailer, spamHintHtml } = await import('@/lib/email')
      const resend = createMailer(process.env.RESEND_API_KEY)
      await resend.emails.send({
        to: email,
        subject: 'Welcome to Tutafy: your tutoring business starts here',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
              <h1 style="color:white;margin:0;font-size:24px;font-weight:800;">Welcome to Tutafy, ${safeName}! 🎉</h1>
              <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">Your entire tutoring business, in one place</p>
            </div>
            <p style="color:#374151;font-size:15px;">Here's what you can do right now:</p>
            <div style="space-y:12px;">
              <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px;">
                <span style="font-size:20px;">📅</span>
                <div>
                  <p style="margin:0;font-weight:600;color:#111827;">Set your availability</p>
                  <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Students can book lessons directly on your booking page</p>
                </div>
              </div>
              <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px;">
                <span style="font-size:20px;">👩‍🎓</span>
                <div>
                  <p style="margin:0;font-weight:600;color:#111827;">Add your students</p>
                  <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Import from Preply/iTalki or add manually</p>
                </div>
              </div>
              <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;display:flex;align-items:flex-start;gap:12px;">
                <span style="font-size:20px;">💳</span>
                <div>
                  <p style="margin:0;font-weight:600;color:#111827;">Connect Stripe to get paid</p>
                  <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Automatic payment tracking and invoicing</p>
                </div>
              </div>
            </div>
            <a href="https://tutafy.com/onboarding" style="display:block;text-align:center;background:#6366f1;color:white;text-decoration:none;padding:14px;border-radius:12px;font-size:15px;font-weight:700;">
              Complete your setup →
            </a>
            ${spamHintHtml()}
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">Tutafy · tutafy.com</p>
          </div>
        `,
      })
  }
  try {
    const { sendWelcomeAtSignup } = await import('@/lib/welcome-send')
    const { resendSender, hasMailKey } = await import('@/lib/welcome-mailer')
    if (hasMailKey(apiKey)) {
      await sendWelcomeAtSignup({ db: admin, tutor: { id: accountId, email, name: accountName, slug }, send: resendSender(), legacy: sendLegacyWelcome })
    }
  } catch { /* email is non-critical */ }

  return NextResponse.json({ ok: true })
}
