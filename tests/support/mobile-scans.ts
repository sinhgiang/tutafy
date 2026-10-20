// The source scans behind tests/mobile-layer.test.ts (T-0629), as functions of one file's text, so that the
// same code runs in that test on the real pages and in tests/measure-claims.test.ts on a small sample in the
// broken state and in the right state.

// ---- buttons drawn at a fixed, non-square size ----------------------------------------------------------------
// [claim: non-square-button] A button drawn at a fixed width and height that differ (a switch: 36x20 with a knob that
// slides a fixed distance) is reported unless it is a role="switch"; the 44px minimums of the phone layer would stretch
// it into a circle with its knob half way. Square icon buttons (w-7 h-7 ...) just grow to 44 square and are not reported.
export const BUTTON_OPENING = /<button\b((?:(?!<[a-zA-Z])[\s\S]){0,900}?)className=(?:"([^"]*)"|\{`([^`]*)`)/g

/** The buttons of one source file that are drawn at a fixed width and height that differ. */
export function nonSquareButtons(src: string) {
  const found: { tag: string; shape: string; isSwitch: boolean; checked: boolean }[] = []
  for (const m of src.matchAll(BUTTON_OPENING)) {
    const classes = (m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(c => c && !c.includes(':'))
    const w = classes.find(c => /^w-\d+(?:\.\d+)?$/.test(c))
    const h = classes.find(c => /^h-\d+(?:\.\d+)?$/.test(c))
    if (!w || !h || w.slice(2) === h.slice(2)) continue
    found.push({ tag: m[0].slice(0, 60), shape: `${w} ${h}`, isSwitch: /role="switch"/.test(m[1]), checked: /aria-checked=\{/.test(m[1]) })
  }
  return found
}

// ---- text sizes under 14px --------------------------------------------------------------------------------------
// [claim: small-text-class] Every utility class that sets a text size under 14px (text-[11px], text-[0.8rem], text-xs ...)
// found in a page is reported, so the phone layer can be made to raise it to 14px.

/** The small text-size classes used in one source file. */
export function smallTextClasses(src: string): string[] {
  const used = new Set<string>()
  for (const m of src.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)) if (Number(m[1]) < 14) used.add(`text-[${m[1]}px]`)
  for (const m of src.matchAll(/\btext-\[(\d*\.?\d+)rem\]/g)) if (Number(m[1]) * 16 < 14) used.add(`text-[${m[1]}rem]`)
  if (/\btext-xs\b/.test(src)) used.add('text-xs')
  return [...used]
}

// ---- fixed widths a phone cannot hold ---------------------------------------------------------------------------
// [claim: fixed-width] A fixed width over 360px without a breakpoint (w-[420px], min-w-[500px], style={{ width: 500 }}) and a
// grid with fixed-pixel columns and no breakpoint prefix are reported.

export function fixedWidthProblems(file: string, src: string): string[] {
  const problems: string[] = []
  for (const m of src.matchAll(/(^|[\s"'`{])((?:min-)?w)-\[(\d+)px\]/g)) {
    if (Number(m[3]) > 360) problems.push(`${file}: ${m[2]}-[${m[3]}px]`)
  }
  for (const m of src.matchAll(/(^|[\s"'`{])grid-cols-\[[^\]]*\d+px[^\]]*\]/g)) problems.push(`${file}: ${m[0].trim()} (put md: in front)`)
  for (const m of src.matchAll(/style=\{\{[^}]*\bwidth:\s*(\d+)\b/g)) if (Number(m[1]) > 360) problems.push(`${file}: inline width ${m[1]}`)
  return problems
}

// ---- tables ------------------------------------------------------------------------------------------------------
// [claim: table-without-frame] A <table> whose three lines above hold no overflow-x-auto frame is reported, so a wide table
// never pushes or cuts the page.

export function tablesWithoutFrame(file: string, src: string): string[] {
  const problems: string[] = []
  const lines = src.split('\n')
  lines.forEach((line, i) => {
    if (!/<table\b/.test(line)) return
    const above = lines.slice(Math.max(0, i - 3), i).join('\n')
    if (!/overflow-x-auto/.test(above)) problems.push(`${file}:${i + 1}`)
  })
  return problems
}
