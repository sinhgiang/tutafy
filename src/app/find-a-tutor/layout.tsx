import { pageMetadata } from '@/lib/page-meta'
import '@/styles/directory-dark.css'

// The finder is a server page with a client form; the title, description and canonical address come from PAGE_SEO.findTutor. The dark colour
// scheme is the directory's own (it follows the visitor's system setting, inside `.dir-page` only).
export const metadata = pageMetadata('findTutor')

export default function FindTutorLayout({ children }: { children: React.ReactNode }) {
  return children
}
