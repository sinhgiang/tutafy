import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function generateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
}

export async function POST(request: NextRequest) {
  const { userId, email, name, refCode } = await request.json()

  if (!userId || !email || !name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Resolve referral code to referrer's UUID (refCode = referrer's slug)
  let referredBy: string | null = null
  if (refCode) {
    const { data: referrer } = await admin.from('tutors').select('id').eq('slug', refCode).single()
    if (referrer) referredBy = referrer.id
  }

  const { error } = await admin.from('tutors').insert({
    id: userId,
    email,
    name,
    slug: generateSlug(name),
    ...(referredBy ? { referred_by: referredBy } : {}),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send onboarding to new tutor
  try {
    const { Resend } = await import('resend')
    if (process.env.RESEND_API_KEY?.startsWith('re_')) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Tutafy <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to Tutafy! 🎉 Your tutoring business starts here',
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
              <h1 style="color:white;margin:0;font-size:24px;font-weight:800;">Welcome to Tutafy, ${name}! 🎉</h1>
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
            <a href="https://tutafy.vercel.app/onboarding" style="display:block;text-align:center;background:#6366f1;color:white;text-decoration:none;padding:14px;border-radius:12px;font-size:15px;font-weight:700;">
              Complete your setup →
            </a>
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">Tutafy · tutafy.vercel.app</p>
          </div>
        `,
      })
    }
  } catch { /* email is non-critical */ }

  return NextResponse.json({ ok: true })
}
