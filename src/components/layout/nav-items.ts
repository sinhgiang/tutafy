// The tutor app's menu, written once: the desktop sidebar (Sidebar.tsx) and the phone
// "More" sheet (MobileNav.tsx) both read it, so a page added here shows up in both.
import {
  LayoutDashboard, Users, Calendar, BookOpen,
  Clock, Sparkles, Settings, MessageCircle, Package, Upload, Gift, RefreshCw, Tag, ListOrdered, BarChart3, Code2, Wallet,
} from 'lucide-react'
import type { Plan } from '@/lib/plans'

export type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; plan?: Plan }

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/students', label: 'Students', icon: Users },
      { href: '/lessons', label: 'Lessons', icon: BookOpen },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
      { href: '/messages', label: 'Messages', icon: MessageCircle },
    ],
  },
  {
    group: 'Business',
    items: [
      { href: '/earnings', label: 'Earnings', icon: BarChart3 },
      { href: '/team', label: 'Team & Payroll', icon: Wallet, plan: 'academy' },
      { href: '/packages', label: 'Packages', icon: Package, plan: 'pro' },
      { href: '/coupons', label: 'Coupons', icon: Tag, plan: 'pro' },
      { href: '/subscriptions', label: 'Subscriptions', icon: RefreshCw, plan: 'pro' },
      { href: '/waitlist', label: 'Waitlist', icon: ListOrdered, plan: 'pro' },
      { href: '/availability', label: 'Availability', icon: Clock },
      { href: '/ai', label: 'AI Tools', icon: Sparkles, plan: 'pro' },
      { href: '/import', label: 'Import', icon: Upload, plan: 'pro' },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/referral', label: 'Refer & Earn', icon: Gift },
      { href: '/developers', label: 'API & Webhooks', icon: Code2, plan: 'pro' },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]
