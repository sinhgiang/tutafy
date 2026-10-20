import { requireAdminPage } from '@/lib/admin-guard'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Signed out -> /login, any non-admin account -> /dashboard (see src/lib/admin.ts)
  await requireAdminPage()

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
