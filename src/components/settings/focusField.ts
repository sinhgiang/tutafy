// Settings opens with a field in view when the address says which one (`/settings?tab=profile&focus=languages`, T-1043). The sections load the first time they
// are opened, so the field may not exist yet: look for it a few times, then scroll to it and put the cursor in it. The ids come from a fixed list
// (parseSettingsFocus), never from the address as typed, and nothing is changed or saved by arriving this way.
import type { SettingsFocusId } from '@/lib/directory-setup'

export const FOCUS_TRIES = 60
export const FOCUS_EVERY_MS = 100
export const focusAnchorId = (id: SettingsFocusId): string => `settings-focus-${id}`

/** Returns a function that stops the search (for an effect's cleanup). */
export function focusSettingsField(id: SettingsFocusId): () => void {
  let tries = 0
  const timer = setInterval(() => {
    const anchor = document.getElementById(focusAnchorId(id))
    if (anchor) {
      clearInterval(timer)
      anchor.scrollIntoView({ block: 'center' })
      anchor.querySelector<HTMLElement>('textarea, input')?.focus({ preventScroll: true })
    } else if (++tries >= FOCUS_TRIES) {
      clearInterval(timer)
    }
  }, FOCUS_EVERY_MS)
  return () => clearInterval(timer)
}
