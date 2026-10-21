// T-0638: the one <main> landmark of the blog list and of every blog post. It lives in a layout
// (not in the two pages) so that a page edited by someone else cannot lose it or add a second one.
// The page's own top bar is inside it; moving the bar out is possible later, when the post page is
// free to edit: then this layout keeps only the <main> around the content.
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>
}
