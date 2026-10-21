// The admin menu, written once: the desktop sidebar (AdminSidebar.tsx) and the phone
// top bar with its drawer (AdminMobileNav.tsx) both read it.
import { LayoutDashboard, Users, GraduationCap, DollarSign, Settings, BarChart3, ShoppingBag, Telescope } from 'lucide-react'

export const ADMIN_NAV: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: '/admin', label: 'Khách hàng của tôi', icon: LayoutDashboard, exact: true },
  { href: '/admin/tutors', label: 'Tutors', icon: Users },
  { href: '/super-admin', label: 'Super admin', icon: Telescope },
  { href: '/admin/buyers', label: 'Buyers', icon: ShoppingBag },
  { href: '/admin/students', label: 'Students', icon: GraduationCap },
  { href: '/admin/revenue', label: 'Tiền học sinh trả', icon: DollarSign },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },

]
