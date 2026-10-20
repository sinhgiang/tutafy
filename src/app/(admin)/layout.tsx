import { requireAdminPage } from '@/lib/admin-guard'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminMobileNav } from '@/components/admin/AdminMobileNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Signed out -> /login, any non-admin account -> /dashboard (see src/lib/admin.ts)
  await requireAdminPage()

  // Phone: a top bar with a menu drawer (AdminMobileNav) above the page; from md up: the sidebar beside it.
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      <AdminMobileNav />
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
