// The one frame every tutor page sits in (T-0820). Before this, each page set its own fixed
// max-w-[Npx] with no mx-auto, so a 900px page was pinned to the left of a 1690px screen.
//
//   PageFrame  - used once, by the layout: 1440px at most, centred, even side padding.
//   PageColumn - for a page that is one narrow column (a form, a single-step flow): centred inside the frame.
//
// A page never sets its own root width. tests/dashboard-shell.test.ts fails when one does.
import { cn } from '@/lib/utils'

export function PageFrame({ children }: { children: React.ReactNode }) {
  return <div data-page-frame className="dash-frame">{children}</div>
}

export type ColumnSize = 'form' | 'list'

/** 'form' is a 720px column (a form or a single step); 'list' is 960px (a short list that reads better narrow). */
export function PageColumn({ size = 'form', className, children }: { size?: ColumnSize; className?: string; children: React.ReactNode }) {
  return <div data-page-column={size} className={cn('dash-column', size === 'list' ? 'dash-column-list' : 'dash-column-form', className)}>{children}</div>
}
