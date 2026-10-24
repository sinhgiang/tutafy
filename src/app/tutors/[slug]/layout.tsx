// T-0638: the one <main> landmark of a tutor's public profile (/tutors/<slug>). It is a layout,
// next to the page and not inside it, so the page keeps its own file untouched. The directory
// page (/tutors) has its own <main> in its page, inside the (directory) route group.
// T-0915: the profile follows the visitor's light or dark setting with the same stylesheet as the directory (the page root carries `dir-page`),
// and the intro video's poster has its own always-dark colours.
import '@/styles/directory-dark.css'
import '@/styles/profile-video.css'
import '@/styles/profile-dark.css'

export default function TutorProfileLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>
}
