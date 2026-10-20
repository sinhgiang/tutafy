// T-0638: the one <main> landmark of a tutor's public profile (/tutors/<slug>). It is a layout,
// next to the page and not inside it, so the page keeps its own file untouched. The directory
// page (/tutors) has its own <main> in its page, inside the (directory) route group.
export default function TutorProfileLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>
}
