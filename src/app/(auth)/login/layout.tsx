import { pageMetadata } from '@/lib/page-meta'

// The sign-in page is a client component, which cannot export metadata; this layout does.
// noindex: a sign-in page should not appear in search results.
export const metadata = pageMetadata('login')

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
