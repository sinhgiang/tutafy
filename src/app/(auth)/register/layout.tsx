import { pageMetadata } from '@/lib/page-meta'

// The sign-up page is a client component, which cannot export metadata; this layout does.
// noindex: a sign-up page should not appear in search results.
export const metadata = pageMetadata('register')

// The form is rendered inside <Suspense> (it reads the search params), so the HTML sent
// to a crawler holds only the spinner. This heading is part of the server HTML and so
// gives the page its one <h1>; it is hidden on screen (sr-only) and read by screen readers.
// The visible "Tutafy" text in the form is a <p>, not a second <h1>.
export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="sr-only">Create your free Tutafy account</h1>
      {children}
    </>
  )
}
