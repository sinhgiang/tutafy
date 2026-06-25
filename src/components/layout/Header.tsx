'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, Settings, ChevronRight } from 'lucide-react'
import type { Tutor } from '@/types'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/lessons': 'Lessons',
  '/calendar': 'Calendar',
  '/payments': 'Payments',
  '/availability': 'Availability',
  '/ai': 'AI Tools',
  '/settings': 'Settings',
}

export function Header({ tutor }: { tutor: Tutor }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const initials = tutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const segment = '/' + pathname.split('/')[1]
  const pageLabel = PAGE_LABELS[segment] ?? 'Tutafy'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-gray-400">Tutafy</span>
        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
        <span className="font-semibold text-gray-900">{pageLabel}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors relative">
          <Bell className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent">
            <Avatar className="h-7 w-7">
              <AvatarImage src={tutor.avatar_url ?? undefined} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-[12px] font-semibold text-gray-800 leading-none">{tutor.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-none truncate max-w-[120px]">{tutor.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[12px] font-semibold text-gray-900">{tutor.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{tutor.email}</p>
            </div>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2 text-[13px] mt-1">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-[13px] text-red-600 focus:text-red-600">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
