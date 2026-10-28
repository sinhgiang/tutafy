// Every email Tutafy sends goes through createMailer: a Resend client whose `emails.send` fills in the sender, the
// reply address and a plain-text copy beside the HTML (all of that is decided in src/lib/email-config.ts, which the
// browser can import too; this file is for the server only because it loads the mail service).
import { Resend } from 'resend'
import { withEmailDefaults, type MailInput, type MailKind } from '@/lib/email-config'

export * from '@/lib/email-config'

type SendPayload = Parameters<Resend['emails']['send']>[0]

export function createMailer(apiKey: string | undefined, kind: MailKind = 'general') {
  const resend = new Resend(apiKey)
  return {
    emails: {
      send: (payload: MailInput, options?: { idempotencyKey?: string }) => resend.emails.send(withEmailDefaults(payload, kind) as SendPayload, options),
      /** Takes back a mail that was scheduled and has not gone yet (T-1064). */
      cancel: (id: string) => resend.emails.cancel(id),
    },
  }
}
