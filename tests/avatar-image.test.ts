// T-0766: what a profile photo may be (src/lib/avatar-image.ts). The REAL code runs on made-up picture files: the type comes from the first bytes
// (never from a name or a label), the size is counted on the decoded bytes, and the hidden notes (location, camera, author) are cut out.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_AVATAR_BYTES, MAX_AVATAR_BASE64_CHARS, checkAvatarBody, ownAvatarPath, sniffImage, stripMetadata } from '@/lib/avatar-image.ts'
import { GPS_NOTE, PIXELS, contains, gif, html, jpeg, png, svg, toBase64, webp } from './support/avatar-files.ts'

const body = (b: Uint8Array) => ({ image: toBase64(b) })

test('the type comes from the first bytes: JPEG, PNG and WebP are known, SVG, GIF, HTML and plain text are not', () => {
  assert.equal(sniffImage(jpeg()), 'image/jpeg')
  assert.equal(sniffImage(png()), 'image/png')
  assert.equal(sniffImage(webp()), 'image/webp')
  for (const [name, file] of [['svg', svg()], ['gif', gif()], ['html', html()], ['text', new TextEncoder().encode('hello')], ['empty', new Uint8Array()], ['riff but not webp', new TextEncoder().encode('RIFF....WAVEfmt ')]] as const) {
    assert.equal(sniffImage(file), null, name)
  }
})

test('a JPEG loses its EXIF block, comment and IPTC block, and keeps its picture data and its first and last markers', () => {
  const clean = stripMetadata(jpeg(), 'image/jpeg')
  assert.ok(contains(jpeg(), GPS_NOTE), 'the sample really holds the note')
  assert.ok(!contains(clean, GPS_NOTE) && !contains(clean, 'Exif') && !contains(clean, 'IPTC'))
  assert.deepEqual(Array.from(clean), Array.from(jpeg(false)), 'the same file as one made without notes')
  assert.deepEqual([clean[0], clean[1], clean[clean.length - 2], clean[clean.length - 1]], [0xff, 0xd8, 0xff, 0xd9])
  assert.ok(contains(clean, String.fromCharCode(...PIXELS)))
})

test('a PNG loses its text, EXIF and time chunks and keeps the rest', () => {
  const clean = stripMetadata(png(), 'image/png')
  assert.ok(contains(png(), GPS_NOTE))
  assert.ok(!contains(clean, GPS_NOTE) && !contains(clean, 'tEXt') && !contains(clean, 'eXIf') && !contains(clean, 'tIME'))
  assert.deepEqual(Array.from(clean), Array.from(png(false)))
})

test('a WebP loses its EXIF and XMP chunks, their flags, and its total size is written again', () => {
  const clean = stripMetadata(webp(), 'image/webp')
  assert.ok(contains(webp(), GPS_NOTE))
  assert.ok(!contains(clean, GPS_NOTE) && !contains(clean, 'EXIF') && !contains(clean, 'XMP '))
  assert.deepEqual(Array.from(clean), Array.from(webp(false)), 'the flags are cleared and the size says what is left (the alpha flag stays)')
  const size = clean[4] | (clean[5] << 8) | (clean[6] << 16) | (clean[7] << 24)
  assert.equal(size, clean.length - 8)
})

test('a file without notes comes through unchanged, and a broken one does not crash the cleaning', () => {
  for (const [file, type] of [[jpeg(false), 'image/jpeg'], [png(false), 'image/png'], [webp(false), 'image/webp']] as const) {
    assert.deepEqual(Array.from(stripMetadata(file, type)), Array.from(file))
  }
  assert.doesNotThrow(() => stripMetadata(jpeg().subarray(0, 9), 'image/jpeg'))
  assert.doesNotThrow(() => stripMetadata(png().subarray(0, 20), 'image/png'))
  assert.doesNotThrow(() => stripMetadata(webp().subarray(0, 20), 'image/webp'))
})

test('a good photo is accepted, with its real type and a file ending that comes from the type', () => {
  for (const [file, type, ext] of [[jpeg(), 'image/jpeg', 'jpg'], [png(), 'image/png', 'png'], [webp(), 'image/webp', 'webp']] as const) {
    const r = checkAvatarBody(body(file))
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.type, type)
      assert.equal(r.ext, ext)
      assert.ok(!contains(r.bytes, GPS_NOTE), 'the notes are already gone in what would be stored')
    }
  }
})

test('the wrong kind of file is refused with 415, whatever it is called: SVG, GIF, HTML and text, even when they start like a photo of another type', () => {
  for (const [name, file] of [['svg', svg()], ['gif', gif()], ['html', html()], ['text', new TextEncoder().encode('just words')]] as const) {
    const r = checkAvatarBody(body(file))
    assert.deepEqual([name, r.ok, !r.ok && r.status], [name, false, 415])
  }
  // a name or a label cannot change this: the body carries no type at all, and an extra field is ignored
  const r = checkAvatarBody({ image: toBase64(svg()), type: 'image/png', name: 'me.png', contentType: 'image/jpeg' })
  assert.deepEqual([r.ok, !r.ok && r.status], [false, 415])
})

test('too big is refused with 413: exactly the limit passes, one byte more does not, and a huge text is refused before it is decoded', () => {
  const pad = (n: number) => {
    const b = new Uint8Array(n)
    b.set(jpeg(false))
    return b
  }
  const atLimit = checkAvatarBody(body(pad(MAX_AVATAR_BYTES)))
  assert.ok(atLimit.ok, 'the limit itself is allowed')
  const over = checkAvatarBody(body(pad(MAX_AVATAR_BYTES + 1)))
  assert.deepEqual([over.ok, !over.ok && over.status], [false, 413])
  const huge = checkAvatarBody({ image: 'A'.repeat(MAX_AVATAR_BASE64_CHARS + 1) })
  assert.deepEqual([huge.ok, !huge.ok && huge.status], [false, 413])
})

test('a body that is not a photo at all is refused with 400', () => {
  for (const b of [null, undefined, 'text', 42, [], {}, { image: '' }, { image: 123 }, { image: null }, { image: 'not base64 !!' }, { image: 'data:image/png;base64,AAAA' }, { image: '====' }]) {
    const r = checkAvatarBody(b)
    assert.deepEqual([JSON.stringify(b), r.ok, !r.ok && r.status], [JSON.stringify(b), false, 400])
  }
})

test('only a photo address in the tutor\'s own folder of the bucket is theirs to delete', () => {
  const base = 'https://abc.supabase.test/storage/v1/object/public/tutor-avatars/'
  const me = '11111111-1111-4111-8111-111111111111'
  const other = '22222222-2222-4222-8222-222222222222'
  assert.equal(ownAvatarPath(`${base}${me}/file.jpg`, base, me), `${me}/file.jpg`)
  for (const url of [
    `${base}${other}/file.jpg`, // another tutor's folder
    `${base}${me}/../${other}/file.jpg`, // a way out of the folder
    `${base}${me}`, `${base}${me}/`, // no file
    `https://elsewhere.example.com/${me}/file.jpg`, // another site
    `${base}${me}/file.jpg?download=1`, `${base}${me}/file.jpg#x`,
    null, undefined, 42, '',
  ]) assert.equal(ownAvatarPath(url, base, me), null, String(url))
})
