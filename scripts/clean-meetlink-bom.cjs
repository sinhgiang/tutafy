// One-off maintenance: strip BOM / zero-width / stray whitespace from existing
// lessons.meet_link values that were saved with a corrupted NEXT_PUBLIC_APP_URL.
const fs = require('fs')
const path = require('path')

const env = {}
fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  .split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) return
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[m[1]] = v
  })

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing supabase creds', { hasUrl: !!url, hasKey: !!key }); process.exit(1) }

const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
const clean = s => s.replace(/[﻿​‌‍⁠]/g, '').trim()

;(async () => {
  const res = await fetch(`${url}/rest/v1/lessons?select=id,meet_link&meet_link=not.is.null`, { headers: H })
  if (!res.ok) { console.error('fetch failed', res.status, await res.text()); process.exit(1) }
  const rows = await res.json()
  let fixed = 0
  for (const r of rows) {
    if (typeof r.meet_link !== 'string') continue
    const c = clean(r.meet_link)
    if (c !== r.meet_link) {
      const up = await fetch(`${url}/rest/v1/lessons?id=eq.${r.id}`, {
        method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ meet_link: c }),
      })
      if (up.ok) { fixed++; console.log('fixed', r.id) }
      else console.error('FAIL', r.id, up.status, await up.text())
    }
  }
  console.log(`Checked ${rows.length} lessons, fixed ${fixed}.`)
})()
