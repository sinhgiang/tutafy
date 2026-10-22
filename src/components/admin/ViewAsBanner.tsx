import { Eye } from 'lucide-react'
import { getAdminT } from '@/lib/admin-lang'
import { VIEW_EXIT_PATH } from '@/lib/view-as'

/**
 * The strip at the top of every page of the tutor's dashboard while the platform admin has a read-only "View as this tutor" open (T-0708):
 * "Viewing as admin: <tutor> · read-only · Exit". It stays on screen while the page scrolls. Exit is a form post to the one write the
 * proxy lets through; it closes the view's log line and goes back to the tutor's page in the admin area. Words come from the admin table.
 */
export async function ViewAsBanner({ tutorName }: { tutorName: string }) {
  const { t } = await getAdminT()
  return (
    <div data-testid="view-as-banner" role="status" className="sticky top-0 z-[60] flex items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950 shadow">
      <span className="flex min-w-0 items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words leading-tight" data-testid="view-as-label">{t('view.banner', { name: tutorName })}</span>
      </span>
      <form method="POST" action={VIEW_EXIT_PATH} className="shrink-0">
        <button type="submit" data-testid="view-as-exit" className="min-h-9 rounded-md bg-amber-950 px-3 py-1 text-sm font-semibold text-amber-50 hover:bg-amber-900">{t('view.exit')}</button>
      </form>
    </div>
  )
}
