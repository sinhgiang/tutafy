// The admin menu, written once: the desktop sidebar (AdminSidebar.tsx) and the phone
// top bar with its drawer (AdminMobileNav.tsx) both read it. The words come from the admin
// translation table (src/lib/admin-i18n.ts), by key.
import { LayoutDashboard, Users, GraduationCap, DollarSign, Settings, BarChart3, ShoppingBag, Telescope, MessageSquare } from 'lucide-react'
import type { AdminKey } from '@/lib/admin-i18n'

export const ADMIN_NAV: { href: string; labelKey: AdminKey; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: '/admin', labelKey: 'nav.customers', icon: LayoutDashboard, exact: true },
  { href: '/admin/tutors', labelKey: 'nav.tutors', icon: Users },
  { href: '/super-admin', labelKey: 'nav.superAdmin', icon: Telescope },
  { href: '/admin/buyers', labelKey: 'nav.buyers', icon: ShoppingBag },
  { href: '/admin/students', labelKey: 'nav.students', icon: GraduationCap },
  { href: '/admin/revenue', labelKey: 'nav.revenue', icon: DollarSign },
  { href: '/admin/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { href: '/admin/feedback', labelKey: 'nav.feedback', icon: MessageSquare },
  { href: '/admin/settings', labelKey: 'nav.settings', icon: Settings },
]
