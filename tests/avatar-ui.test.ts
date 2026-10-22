// T-0766: the photo box in Settings, Profile and the checks the browser makes before it sends a picture. The REAL component is drawn to HTML for each
// state (no photo, a photo), the choice of files is the three allowed types, and the Settings page keeps the photo OUT of the form it saves (so
// pressing Save can never write an old photo address back over a new one).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvatarUploader } from '@/components/settings/AvatarUploader.tsx'
import { MAX_PICKED_BYTES, PICKABLE, pickProblem } from '@/lib/avatar-client.ts'
import { AVATAR_TYPES } from '@/lib/avatar-image.ts'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const read = (rel: string) => readFileSync(path.join(SRC, rel), 'utf8').replace(/\r\n/g, '\n')
const code = (rel: string) => read(rel).split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

const draw = (url: string | null, name = 'Carlos Mendes') => renderToStaticMarkup(createElement(AvatarUploader, { name, url, onChange: () => {} }))

test('no photo yet: the initials tile, an "Upload photo" button, the rules in plain words, and no Remove button', () => {
  const html = draw(null)
  assert.match(html, /data-testid="avatar-initials"[^>]*>CM</)
  assert.match(html, /Upload photo/)
  assert.doesNotMatch(html, /Remove|data-testid="avatar-preview"/)
  assert.match(html, /JPG, PNG or WebP, up to 2 MB/)
  assert.match(html, /role="status" aria-live="polite"/, 'what happened is read out')
})

test('a photo: the picture with a text alternative, a "Change photo" button and a Remove button', () => {
  const html = draw('https://abc.supabase.test/storage/v1/object/public/tutor-avatars/x/y.jpg')
  assert.match(html, /<img src="https:\/\/abc\.supabase\.test\/storage\/v1\/object\/public\/tutor-avatars\/x\/y\.jpg" alt="Photo of Carlos Mendes"/)
  assert.match(html, /Change photo/)
  assert.match(html, /Remove/)
  assert.doesNotMatch(html, /data-testid="avatar-initials"/)
})

test('text in the name is shown as text, never as markup', () => {
  const html = draw(null, '<img src=x onerror=alert(1)>')
  assert.doesNotMatch(html, /<img src=x/)
})

test('the file chooser offers exactly the three types the server accepts', () => {
  const html = draw(null)
  assert.match(html, /<input [^>]*type="file"[^>]*accept="image\/jpeg,image\/png,image\/webp"/)
  assert.deepEqual([...PICKABLE].sort(), Object.keys(AVATAR_TYPES).sort())
})

test('before anything is sent the browser refuses a wrong type or a huge file with a plain sentence', () => {
  assert.equal(pickProblem({ type: 'image/jpeg', size: 1000 }), null)
  assert.equal(pickProblem({ type: 'image/png', size: MAX_PICKED_BYTES }), null)
  assert.match(pickProblem({ type: 'image/png', size: MAX_PICKED_BYTES + 1 }) ?? '', /too big/)
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', 'text/html', '']) assert.match(pickProblem({ type, size: 10 }) ?? '', /JPG, PNG or WebP/, type)
})

test('Settings shows the box on the Profile tab and keeps the photo out of the form that Save writes', () => {
  const settings = read('app/(dashboard)/settings/page.tsx')
  assert.match(settings, /<AvatarUploader name=\{form\.name\} url=\{avatarUrl\} onChange=\{setAvatarUrl\} \/>/)
  const form = /const \[form, setForm\] = useState\(\{[\s\S]*?\n  \}\)/.exec(settings)?.[0] ?? ''
  assert.ok(form.length > 100 && !/avatar/i.test(form), 'the form state holds no photo')
  assert.ok(!/avatar_url/.test(code('app/(dashboard)/settings/page.tsx').replace(/setAvatarUrl\(typeof data\.avatar_url[^\n]*/, '')), 'Save never writes avatar_url')
})

test('the browser side sends the photo as JSON to the one route, as the tutor, with no tutor id in it', () => {
  const ui = code('components/settings/AvatarUploader.tsx')
  assert.match(ui, /fetch\('\/api\/tutors\/avatar'/)
  assert.match(ui, /JSON\.stringify\(\{ image: prepared\.base64 \}\)/)
  assert.ok(!/tutorId|tutor_id|userId/.test(ui))
  assert.ok(!/supabase\.storage|\.storage\./.test(ui + code('lib/avatar-client.ts')), 'the browser never talks to storage itself')
})
