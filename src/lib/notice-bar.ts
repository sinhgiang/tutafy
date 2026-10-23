// Which notice the tutor app shows in its one notice bar (T-0820). Before, the cookie notice and the
// "Enable notifications" prompt were two floating cards that could both sit over the page at once
// (and on a phone covered half of the first screen). Now there is ONE bar and it shows ONE notice:
// the cookie notice first (it is a legal choice), the notification prompt after it has been answered.
export type NoticeKind = 'cookie' | 'push' | 'push-blocked'

export type NoticeState = {
  /** The visitor's cookie choice, null when they have not chosen yet. */
  consent: 'accepted' | 'declined' | null
  /** Notification.permission, or 'unsupported' when this browser has no Notification. */
  permission: 'default' | 'granted' | 'denied' | 'unsupported'
  /** The tutor pressed Later on the prompt in this browser session. */
  pushDismissed: boolean
  /** The state has been read in the browser (false while the server draws, so nothing flashes). */
  ready: boolean
}

export function nextNotice(s: NoticeState): NoticeKind | null {
  if (!s.ready) return null
  if (s.consent === null) return 'cookie'
  if (s.pushDismissed) return null
  if (s.permission === 'default') return 'push'
  if (s.permission === 'denied') return 'push-blocked'
  return null
}
