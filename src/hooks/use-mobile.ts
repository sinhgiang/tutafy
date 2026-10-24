import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

// The width is read from the browser, so the server (and the first paint of the page) answers "not mobile"
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, () => window.innerWidth < MOBILE_BREAKPOINT, () => false)
}
