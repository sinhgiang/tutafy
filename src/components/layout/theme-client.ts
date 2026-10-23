// Browser side of the tutor app's theme (T-0820). The pure rules are in src/lib/dashboard-theme.ts.
// The theme is set on the shell element (.dash, data-theme) and, so that menus and dialogs drawn outside the shell
// (shadcn portals) follow it, as the "dark" class on <html>. The class is removed again when the tutor leaves the app.
import { THEME_KEY, parsePref, resolveTheme, toggledPref, type Theme, type ThemePref } from '@/lib/dashboard-theme'

export const THEME_EVENT = 'tutafy-theme'

const shell = () => document.querySelector<HTMLElement>('.dash')

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function savedPref(): ThemePref {
  try { return parsePref(localStorage.getItem(THEME_KEY)) } catch { return 'system' }
}

/** The theme on screen now. */
export function currentTheme(): Theme {
  return shell()?.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

/** Draws a theme without saving it (used at start and when the system changes). */
export function paintTheme(theme: Theme) {
  shell()?.setAttribute('data-theme', theme)
  document.documentElement.classList.toggle('dark', theme === 'dark')
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }))
}

/** Saves a choice (in this browser only) and draws it. */
export function chooseTheme(pref: ThemePref) {
  try { localStorage.setItem(THEME_KEY, pref) } catch { /* private window: the choice lasts until the page closes */ }
  paintTheme(resolveTheme(pref, systemPrefersDark()))
}

export function toggleTheme() {
  chooseTheme(toggledPref(currentTheme()))
}

/** Removes the html class when the tutor leaves the app, so public pages are never drawn dark. */
export function releaseTheme() {
  document.documentElement.classList.remove('dark')
}
