import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { createCalendarEvent } from '@/lib/google-calendar'
import { fireWebhooks } from '@/lib/webhooks'

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

// Resolve the site's public origin. We prefer the live request's Origin/Host
// (so the link always matches the domain the user is actually on) and fall back
// to the env var — sanitized, because a stray BOM/whitespace in NEXT_PUBLIC_APP_URL
// turns an absolute URL into a broken relative path (…/portal/%EF%BB%BFhttps://…).
function resolveOrigin(request: Request): string {
  const strip = (s: string) => s.replace(/[﻿​\s]/g, '').replace(/\/+$/, '')
  const fromHeader = request.headers.get('origin')
  if (fromHeader) return strip(fromHeader)
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return strip(`${proto}://${host}`)
  }
  return strip(process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com') || 'https://tutafy.com'
}

// The lesson's video link points to Tutafy's own branded, in-app room — not a
// raw meet.jit.si URL. It runs on our domain, carries our UI, and returns the
// student to their portal automatically when the call ends. `portalToken` +
// `lessonId` uniquely identify the student's room.
function genRoomLink(origin: string, portalToken: string, lessonId: string): string {
  return `${origin}/portal/${portalToken}/lessons/${lessonId}/room`
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

    let wasNewStudent = false
    if (!student) {
      const { data: newStudent } = await supabase
        .from('students')
        .insert({ tutor_id: tutorId, name, email, notes: message ?? '' })
        .select('id, portal_token')
        .single()
      student = newStudent
      wasNewStudent = true
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

    // Create lesson with a branded, in-app video room link. We mint the lesson id
    // up front so the room URL can be built before the row is inserted.
    const lessonId = crypto.randomUUID()
    const origin = resolveOrigin(request)
    const meetLink = genRoomLink(origin, (student as any).portal_token, lessonId)
    const { data: createdLesson, error } = await supabase.from('lessons').insert({
      id: lessonId,
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

    // Fire integration webhooks (Zapier etc.) — fire-and-forget, never blocks.
    if (wasNewStudent) {
      fireWebhooks(tutorId, 'student.created', { student: { id: student.id, name, email } })
    }
    fireWebhooks(tutorId, 'lesson.created', {
      lesson: { id: lessonId, starts_at: startsAt.toISOString(), duration_minutes: duration, price: finalPrice, student_name: name, student_email: email },
    })

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

      // Deep-links so each recipient can jump straight from the email to the
      // right place: the student to their portal, the tutor to the lesson detail.
      const studentPortalLink = `${origin}/portal/${(student as any).portal_token}`
      const tutorLessonLink = `${origin}/lessons/${lessonId}`
      const btn = (href: string, label: string) => `
        <div style="text-align:center;margin:24px 0 8px;">
          <a href="${href}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:10px;">${label}</a>
        </div>`

      // Email to student
      await resend.emails.send({
        from,
        to: email,
        subject: `Booking Confirmed — ${tutor?.name ?? 'Your tutor'} on ${dateLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
            <div style="background:#6366f1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <h1 style="color:white;margin:0;font-size:22px;">Booking Confirmed! ✓</h1>
            </div>
            <p style="color:#374151;font-size:15px;">Hi <strong>${name}</strong>,</p>
            <p style="color:#374151;font-size:15px;">Your lesson with <strong>${tutor?.name ?? 'your tutor'}</strong> is confirmed.</p>
            <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:20px 0;">
              <p style="margin:4px 0;color:#6b7280;font-size:13px;">📅 Date</p>
              <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${dateLabel}</p>
              <p style="margin:4px 0;color:#6b7280;font-size:13px;">🕐 Time</p>
              <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${timeLabel}</p>
              <p style="margin:4px 0;color:#6b7280;font-size:13px;">⏱ Duration</p>
              <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${duration} minutes</p>
            </div>
            ${message ? `<p style="color:#6b7280;font-size:13px;font-style:italic;">Your note: "${message}"</p>` : ''}
            ${btn(studentPortalLink, 'View your booking details →')}
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:8px;">or copy this link: ${studentPortalLink}</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Powered by Tutafy · tutafy.com</p>
          </div>
        `,
      }).catch(() => {})

      // Email to tutor
      if (tutor?.email) {
        await resend.emails.send({
          from,
          to: tutor.email,
          subject: `New booking from ${name} — ${dateLabel}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
              <h2 style="color:#111827;">New Booking 📅</h2>
              <p style="color:#374151;font-size:15px;"><strong>${name}</strong> has booked a lesson with you.</p>
              <div style="background:#f3f4f6;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:4px 0;color:#6b7280;font-size:13px;">Student</p>
                <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${name} · ${email}</p>
                <p style="margin:4px 0;color:#6b7280;font-size:13px;">Date & Time</p>
                <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">${dateLabel} at ${timeLabel}</p>
                <p style="margin:4px 0;color:#6b7280;font-size:13px;">Duration</p>
                <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${duration} minutes</p>
              </div>
              ${message ? `<p style="color:#374151;font-size:14px;">Student note: <em>"${message}"</em></p>` : ''}
              ${btn(tutorLessonLink, 'View booking details →')}
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:8px;">or open it here: ${tutorLessonLink}</p>
              <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Tutafy · tutafy.com</p>
            </div>
          `,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true, portal_token: (student as any)?.portal_token ?? null, lesson_id: createdLesson?.id ?? null })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
