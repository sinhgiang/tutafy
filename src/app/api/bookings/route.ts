import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { createCalendarEvent } from '@/lib/google-calendar'

async function validateAndApplyCoupon(supabase: any, tutorId: string, code: string, basePrice: number | null) {
  if (!code || !basePrice) return { discount: 0, couponId: null }
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, discount_type, discount_value, max_uses, uses_count, expires_at')
    .eq('tutor_id', tutorId)
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .single()
  if (!coupon) return { discount: 0, couponId: null }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { discount: 0, couponId: null }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) return { discount: 0, couponId: null }

  const discount = coupon.discount_type === 'percent'
    ? Math.min(basePrice, (basePrice * Number(coupon.discount_value)) / 100)
    : Math.min(basePrice, Number(coupon.discount_value))

  // Increment usage count
  await supabase.from('coupons').update({ uses_count: coupon.uses_count + 1 }).eq('id', coupon.id)
  return { discount, couponId: coupon.id }
}

function genMeetLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const room = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `https://meet.jit.si/tutafy-${room}`
}

export async function POST(request: Request) {
  try {
    const { tutorId, date, time, duration, name, email, message, termsAgreed, isTrial, couponCode } = await request.json()

    if (!tutorId || !date || !time || !duration || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const startsAt = new Date(`${date}T${time}:00`)
    const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000)

    // Check if slot is already booked
    const { data: existing } = await supabase
      .from('lessons')
      .select('id')
      .eq('tutor_id', tutorId)
      .eq('starts_at', startsAt.toISOString())
      .neq('status', 'cancelled')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This slot is already booked. Please choose another time.' }, { status: 409 })
    }

    // Get tutor info for email + calendar
    const { data: tutor } = await supabase
      .from('tutors')
      .select('name, email, default_lesson_price, trial_price, trial_enabled, google_calendar_refresh_token, google_calendar_id')
      .eq('id', tutorId)
      .single()

    // Find or create student record
    let { data: student } = await supabase
      .from('students')
      .select('id, portal_token')
      .eq('tutor_id', tutorId)
      .eq('email', email)
      .single()

    if (!student) {
      const { data: newStudent } = await supabase
        .from('students')
        .insert({ tutor_id: tutorId, name, email, notes: message ?? '' })
        .select('id, portal_token')
        .single()
      student = newStudent
    }

    if (!student) {
      return NextResponse.json({ error: 'Failed to create student record' }, { status: 500 })
    }

    // Calculate final price
    let finalPrice: number | null = null
    let discountAmount: number | null = null

    if (isTrial && tutor?.trial_enabled && tutor?.trial_price) {
      finalPrice = Number(tutor.trial_price)
    } else if (tutor?.default_lesson_price) {
      finalPrice = Number(tutor.default_lesson_price)
    }

    if (finalPrice !== null && couponCode) {
      const { discount } = await validateAndApplyCoupon(supabase, tutorId, couponCode, finalPrice)
      discountAmount = discount > 0 ? discount : null
      finalPrice = Math.max(0, finalPrice - (discountAmount ?? 0))
    }

    // Create lesson with auto-generated meet link
    const meetLink = genMeetLink()
    const { data: createdLesson, error } = await supabase.from('lessons').insert({
      tutor_id: tutorId,
      student_id: student.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      duration_minutes: duration,
      status: 'scheduled',
      meet_link: meetLink,
      terms_agreed_at: termsAgreed ? new Date().toISOString() : null,
      is_trial: isTrial ?? false,
      coupon_code: couponCode ?? null,
      discount_amount: discountAmount,
      price: finalPrice,
      payment_status: finalPrice === 0 ? 'free' : 'pending',
    }).select('id').single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sync to Google Calendar (fire-and-forget)
    if (createdLesson && (tutor as any)?.google_calendar_refresh_token) {
      try {
        const gcalId = await createCalendarEvent(
          (tutor as any).google_calendar_refresh_token,
          (tutor as any).google_calendar_id ?? 'primary',
          {
            summary: `Lesson with ${name}`,
            description: [
              message ? `Student note: ${message}` : null,
              `Meet: ${meetLink}`,
              `Student: ${email}`,
            ].filter(Boolean).join('\n'),
            start: { dateTime: startsAt.toISOString() },
            end: { dateTime: endsAt.toISOString() },
          }
        )
        if (gcalId) {
          await supabase.from('lessons').update({ google_event_id: gcalId } as any).eq('id', createdLesson.id)
        }
      } catch { /* non-critical */ }
    }

    // Send confirmation emails
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your_')) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const dateLabel = startsAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const timeLabel = startsAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const from = 'Tutafy <noreply@tutafy.com>'

      // Email to student
      await resend.emails.send({
        from,
        to: email,
        subject: `Booking Confirmed â€” ${tutor?.name ?? 'Your tutor'} on ${dateLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#6366f1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:white;margin:0;font-size:22px;">Booking Confirmed! âœ“</h1>
            </div>
            <p style="color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
            <p style="color:#374151;font-size:15px;">Your lesson with <strong>${tutor?.name ?? 'your tutor'}</strong> is confirmed.</p>
            <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="margin:4px 0;color:#6b7280;font-size:13px;">ðŸ“… Date</p>
              <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${dateLabel}</p>
              <p style="margin:4px 0;color:#6b7280;font-size:13px;">ðŸ• Time</p>
              <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${timeLabel}</p>
              <p style="margin:4px 0;color:#6b7280;font-size:13px;">â± Duration</p>
              <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${duration} minutes</p>
            </div>
            ${message ? `<p style="color:#6b7280;font-size:13px;font-style:italic;">Your note: "${message}"</p>` : ''}
            <p style="color:#9ca3af;font-size:12px;margin-top:32px;">Powered by Tutafy Â· tutafy.com</p>
          </div>
        `,
      }).catch(() => {})

      // Email to tutor
      if (tutor?.email) {
        await resend.emails.send({
          from,
          to: tutor.email,
          subject: `New booking from ${name} â€” ${dateLabel}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
              <h2 style="color:#111827;">New Booking ðŸ“…</h2>
              <p style="color:#374151;font-size:15px;"><strong>${name}</strong> has booked a lesson with you.</p>
              <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:4px 0;color:#6b7280;font-size:13px;">Student</p>
                <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${name} Â· ${email}</p>
                <p style="margin:4px 0;color:#6b7280;font-size:13px;">Date & Time</p>
                <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${dateLabel} at ${timeLabel}</p>
                <p style="margin:4px 0;color:#6b7280;font-size:13px;">Duration</p>
                <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${duration} minutes</p>
              </div>
              ${message ? `<p style="color:#374151;font-size:14px;">Student note: <em>"${message}"</em></p>` : ''}
              <p style="color:#9ca3af;font-size:12px;margin-top:32px;">Tutafy Â· tutafy.com</p>
            </div>
          `,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, portal_token: (student as any)?.portal_token ?? null })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
