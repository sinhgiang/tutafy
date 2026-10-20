'use client'

import type { ReactNode } from 'react'
import { trackCheckoutClick } from '@/lib/track-client'

// A normal link to the Polar checkout that also records "checkout clicked" for the
// visitor journey (only when the visitor accepted cookies; see track-client.ts).
export function TrackedCheckoutLink({ href, plan, className, children }: {
  href: string
  plan: 'pro' | 'academy'
  className?: string
  children: ReactNode
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => trackCheckoutClick(plan)}>
      {children}
    </a>
  )
}
