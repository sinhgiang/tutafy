// The one place the welcome series reaches the mail service (T-0737): a SendMail (src/lib/welcome-send.ts) over createMailer.
// The sender is "Tutafy" (the general kind) with Reply-To the company mailbox and a plain-text copy, all from src/lib/email-config.ts.
// A refusal by the mail service comes back as { ok: false } (the sender then removes its claim); it is never thrown at the caller.
import { createMailer } from '@/lib/email'
import type { SendMail } from '@/lib/welcome-send'

export function resendSender(): SendMail {
  const mailer = createMailer(process.env.RESEND_API_KEY, 'general')
  return async mail => {
    try {
      const r = await mailer.emails.send(mail)
      return { ok: !(r as { error?: unknown } | null | undefined)?.error }
    } catch {
      return { ok: false }
    }
  }
}

/** True when the server has a mail key worth using (the same test the other routes make). */
export const hasMailKey = (key: string | undefined) => (key ?? '').startsWith('re_')
