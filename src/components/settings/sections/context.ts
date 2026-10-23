// What the Settings page hands to each of its sections (T-0844). The state stays in the page, so a section that is not on screen loses
// nothing: the form values, the unsaved-changes bar and the live preview all read the same `form`.
import type { Dispatch, SetStateAction } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SettingsForm = {
  name: string
  bio: string
  timezone: string
  cancellation_hours: number
  booking_url_active: boolean
  buffer_minutes: number
  paypal_link: string
  paddle_checkout_link: string
  default_lesson_price: string
  contract_template: string
  trial_enabled: boolean
  trial_price: string
  currency: string
  lesson_durations: number[]
  default_lesson_duration: number
  hide_branding: boolean
}

export type SettingsCtx = {
  form: SettingsForm
  setForm: Dispatch<SetStateAction<SettingsForm>>
  savedSnapshot: string
  userId: string
  userEmail: string
  slug: string
  avatarUrl: string | null
  setAvatarUrl: Dispatch<SetStateAction<string | null>>
  linkCopied: boolean
  setLinkCopied: Dispatch<SetStateAction<boolean>>
  cardLinkError: string
  setCardLinkError: Dispatch<SetStateAction<string>>
  customLength: string
  setCustomLength: Dispatch<SetStateAction<string>>
  customLengthError: string
  setCustomLengthError: Dispatch<SetStateAction<string>>
  stripeConnected: boolean
  stripeEnabled: boolean | null
  connectingStripe: boolean
  connectStripe: () => void | Promise<void>
  gcalConnected: boolean
  setGcalConnected: Dispatch<SetStateAction<boolean>>
  disconnectingGcal: boolean
  setDisconnectingGcal: Dispatch<SetStateAction<boolean>>
  subscriptionStatus: string
  isPaid: boolean
  planLabel: string
  savedCardLink: string
  savedCardLinkUnusable: boolean
  supabase: SupabaseClient
}
