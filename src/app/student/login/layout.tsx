import { pageMetadata } from '@/lib/page-meta'

// The student sign-in page is a client component, which cannot export metadata; this
// layout does. noindex: a sign-in page should not appear in search results.
export const metadata = pageMetadata('studentLogin')

export default function StudentLoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
