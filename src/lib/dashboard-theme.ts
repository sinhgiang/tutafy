// Light and dark theme of the tutor app. The colours themselves are in src/styles/dashboard-shell.css
// (the --d-* tokens); this file holds the choice: what was saved, what the system prefers, what is drawn.
// The choice is kept in this browser only (a per-viewer convenience), so every read and write is guarded.

export type ThemePref = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

export const THEME_KEY = 'tutafy_dash_theme'

/** What the saved value means; anything else (nothing saved, a value from a future version) is "system". */
export function parsePref(raw: string | null | undefined): ThemePref {
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

/** The theme to draw for a choice, given whether the system asks for dark. */
export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

/** What pressing the theme button does: from the theme on screen to the other one. */
export function toggledPref(current: Theme): ThemePref {
  return current === 'dark' ? 'light' : 'dark'
}

/**
 * Runs before the first paint, as the first child of the shell, so a dark theme never flashes light.
 * It sets data-theme on its parent. It must stay in step with resolveTheme (tests/dashboard-shell.test.ts runs both).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=null;try{p=localStorage.getItem('${THEME_KEY}')}catch(e){}var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='light'||p==='dark'?p:(d?'dark':'light');document.currentScript.parentElement.setAttribute('data-theme',t)}catch(e){}})()`
