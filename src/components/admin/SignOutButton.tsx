'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAdminT } from './AdminLang'

/**
 * The one way out of the admin area: it only signs out (there is no sign-in button here). The sidebar keeps it at the bottom of
 * the window and the phone top bar keeps it in view, so it is on screen on every admin page whatever its length.
 */
export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const t = useAdminT()

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <button type="button" data-testid="sign-out" onClick={handleSignOut} className={cn('flex items-center gap-2 text-sm bg-transparent border-0 transition-colors', className)}>
      <LogOut className="h-4 w-4 flex-shrink-0" />
      <span>{t('shell.signOut')}</span>
    </button>
  )
}
