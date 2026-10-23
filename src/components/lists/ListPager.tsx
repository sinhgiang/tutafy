// The "Showing 1 to 25 of 120" line and the Previous and Next links under a list (T-0822). Plain links, so paging works
// without scripts and the address says which page it is.
import Link from 'next/link'
import { PAGE_SIZE, pageCount } from '@/lib/list-params'

export function ListPager({ total, page, hrefFor, noun }: { total: number; page: number; hrefFor: (page: number) => string; noun: string }) {
  const pages = pageCount(total)
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const last = Math.min(page * PAGE_SIZE, total)
  return (
    <div className="dash-pager" data-testid="pager">
      <span>{total === 0 ? `No ${noun}` : `Showing ${first} to ${last} of ${total} ${noun}`}</span>
      {pages > 1 && (
        <nav aria-label="Pages">
          <Link href={hrefFor(page - 1)} className="dash-btn" aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined}>Previous</Link>
          <span style={{ alignSelf: 'center' }}>Page {page} of {pages}</span>
          <Link href={hrefFor(page + 1)} className="dash-btn" aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined}>Next</Link>
        </nav>
      )}
    </div>
  )
}
