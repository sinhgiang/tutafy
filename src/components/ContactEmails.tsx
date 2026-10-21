import { Fragment } from 'react'
import { CONTACT_EMAILS } from '@/lib/contact'

// The contact addresses of CONTACT_EMAILS as clickable mailto links, the first one first, joined by `separator`
// ("a or b"). Pages never write the addresses themselves (src/lib/contact.ts, tests/contact-emails.test.ts).
export function ContactEmails({ linkClassName, separator = ' or ' }: { linkClassName?: string; separator?: string }) {
  return (
    <>
      {CONTACT_EMAILS.map((email, i) => (
        <Fragment key={email}>
          {i > 0 && separator}
          <a href={`mailto:${email}`} className={linkClassName}>{email}</a>
        </Fragment>
      ))}
    </>
  )
}
