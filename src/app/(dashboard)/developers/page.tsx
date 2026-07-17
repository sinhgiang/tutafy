import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireFeature } from '@/lib/guard'
import { DevelopersClient } from './DevelopersClient'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://tutafy.com').replace(/[﻿​\s]/g, '').replace(/\/+$/, '')

export default async function DevelopersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locked = await requireFeature('pro', 'API & Webhooks')
  if (locked) return locked

  return <DevelopersClient apiBase={`${APP_URL}/api/v1`} />
}
