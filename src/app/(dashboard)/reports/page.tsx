import { redirect } from 'next/navigation'

// Payments and Reports are one page now (T-0821); old links and bookmarks land on the right tab.
export default function ReportsPage() {
  redirect('/earnings?tab=reports')
}
