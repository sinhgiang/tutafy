import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const isConfigured =
  SUPABASE_URL.startsWith('http') && !SUPABASE_URL.includes('your_')

export async function createClient() {
  const cookieStore = await cookies()

  if (!isConfigured) {
    throw new Error('Supabase chưa được cấu hình. Vui lòng điền .env.local')
  }

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

// Bypasses RLS — admin use only
export function createAdminClient() {
  if (!isConfigured || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin client chưa được cấu hình')
  }
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
