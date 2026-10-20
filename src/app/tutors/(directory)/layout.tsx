import { pageMetadata } from '@/lib/page-meta'

// The tutors page is a client component, which cannot export metadata; this layout does.
// It sits in the (directory) route group so that it covers /tutors only: a tutor's own
// page (/tutors/[slug]) must not inherit this title and canonical address.
export const metadata = pageMetadata('tutors')

export default function TutorsLayout({ children }: { children: React.ReactNode }) {
  return children
}
