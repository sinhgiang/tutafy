import { Fragment } from 'react'
import { contactEmails } from '@/lib/contact'

// The contact addresses of contactEmails() as clickable mailto links, the first one first, joined by `separator`
// ("a or b"). Pages never write the addresses themselves (src/lib/contact.ts, tests/contact-emails.test.ts).
export function ContactEmails({ linkClassName, separator = ' or ' }: { linkClassName?: string; separator?: string }) {
  return (
    <>
      {contactEmails().map((email, i) => (
        <Fragment key={email}>
          {i > 0 && separator}
          <a href={`mailto:${email}`} className={linkClassName}>{email}</a>
        </Fragment>
      ))}
    </>
  )
}
