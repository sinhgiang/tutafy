// What a tutor's profile photo may be, and what is done to it before it is kept (T-0766). Plain .ts with no browser, React or database imports,
// so the node tests can load it.
//
// The upload route (src/app/api/tutors/avatar/route.ts) trusts nothing the browser says about the file: the type is read from the first
// bytes (never from the name or from `Content-Type`), the size is counted on the decoded bytes, and the picture's hidden notes (where it was
// taken, which camera, who made it) are cut out of the bytes before the file is stored. Only JPEG, PNG and WebP are accepted: no SVG (it can
// carry script) and no GIF.

/** The most bytes one photo may have once decoded: the same number is the bucket's own limit (supabase/migrations/024_tutor_avatars.sql). */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export const AVATAR_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
export type AvatarType = keyof typeof AVATAR_TYPES

/** The longest base64 text that can hold MAX_AVATAR_BYTES: checked before anything is decoded. */
export const MAX_AVATAR_BASE64_CHARS = Math.ceil((MAX_AVATAR_BYTES * 4) / 3) + 8

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v)
const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len))

/** The real type of a picture from its first bytes, or null when it is none of the three allowed ones. */
export function sniffImage(b: Uint8Array): AvatarType | null {
  if (b.length >= 3 && startsWith(b, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (b.length >= 8 && startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'image/webp'
  return null
}

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { out.set(p, at); at += p.length }
  return out
}

/** JPEG: drop the EXIF/XMP block (APP1), the IPTC block (APP13) and comments. The picture's own data and colour profile stay. */
function stripJpeg(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [b.subarray(0, 2)]
  let i = 2
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) { parts.push(b.subarray(i)); break }
    const marker = b[i + 1]
    if (marker === 0xff) { i += 1; continue } // fill byte
    if (marker === 0xda) { parts.push(b.subarray(i)); break } // start of the picture data: the rest is copied as it is
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { parts.push(b.subarray(i, i + 2)); i += 2; continue } // markers with no length
    if (i + 3 >= b.length) { parts.push(b.subarray(i)); break }
    const end = Math.min(b.length, i + 2 + ((b[i + 2] << 8) | b[i + 3]))
    if (!(marker === 0xe1 || marker === 0xed || marker === 0xfe)) parts.push(b.subarray(i, end))
    i = end
  }
  return concat(parts)
}

/** PNG: drop the text and EXIF chunks (tEXt, zTXt, iTXt, eXIf, tIME). */
function stripPng(b: Uint8Array): Uint8Array {
  const drop = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME'])
  const parts: Uint8Array[] = [b.subarray(0, 8)]
  let i = 8
  while (i + 8 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
    const end = Math.min(b.length, i + 12 + len)
    if (!drop.has(ascii(b, i + 4, 4))) parts.push(b.subarray(i, end))
    i = end
  }
  if (i < b.length) parts.push(b.subarray(i))
  return concat(parts)
}

/** WebP: drop the EXIF and XMP chunks, clear their flags in the VP8X header, and write the new total size. */
function stripWebp(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = []
  let i = 12
  while (i + 8 <= b.length) {
    const tag = ascii(b, i, 4)
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0
    const end = Math.min(b.length, i + 8 + len + (len % 2))
    if (tag !== 'EXIF' && tag !== 'XMP ') {
      const chunk = b.slice(i, end)
      if (tag === 'VP8X' && chunk.length > 8) chunk[8] &= ~(0x08 | 0x04) // the EXIF and XMP flags
      parts.push(chunk)
    }
    i = end
  }
  const body = concat(parts)
  const head = new Uint8Array(12)
  head.set(b.subarray(0, 12))
  const size = body.length + 4 // "WEBP" plus the chunks
  head[4] = size & 0xff; head[5] = (size >>> 8) & 0xff; head[6] = (size >>> 16) & 0xff; head[7] = (size >>> 24) & 0xff
  return concat([head, body])
}

/** The same picture with its hidden notes (location, camera, author) cut out. A file that is not one of the three types is returned as it is. */
export function stripMetadata(b: Uint8Array, type: AvatarType): Uint8Array {
  if (type === 'image/jpeg') return stripJpeg(b)
  if (type === 'image/png') return stripPng(b)
  return stripWebp(b)
}

export type AvatarCheck =
  | { ok: true; bytes: Uint8Array; type: AvatarType; ext: string }
  | { ok: false; status: 400 | 413 | 415; error: string }

/** The picture in a request body (`{ image: "<base64>" }`), checked and cleaned. Nothing is stored here. */
export function checkAvatarBody(body: unknown): AvatarCheck {
  const image = body !== null && typeof body === 'object' ? (body as { image?: unknown }).image : undefined
  if (typeof image !== 'string' || image.length === 0) return { ok: false, status: 400, error: 'Choose a photo to upload.' }
  if (image.length > MAX_AVATAR_BASE64_CHARS) return { ok: false, status: 413, error: 'That photo is too big. Use one under 2 MB.' }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return { ok: false, status: 400, error: 'We could not read that photo.' }
  const bytes = new Uint8Array(Buffer.from(image, 'base64'))
  if (bytes.length > MAX_AVATAR_BYTES) return { ok: false, status: 413, error: 'That photo is too big. Use one under 2 MB.' }
  const type = sniffImage(bytes)
  if (!type) return { ok: false, status: 415, error: 'Use a JPG, PNG or WebP photo.' }
  const clean = stripMetadata(bytes, type)
  return { ok: true, bytes: clean, type, ext: AVATAR_TYPES[type] }
}

/**
 * The storage path of one of the tutor's OWN photos in a public address, or null. The address must start with the bucket's public base and
 * the tutor's own folder: a photo address that points anywhere else (another tutor's folder, another site) is never deleted from here.
 */
export function ownAvatarPath(url: unknown, publicBase: string, tutorId: string): string | null {
  if (typeof url !== 'string' || !url.startsWith(publicBase)) return null
  const path = url.slice(publicBase.length)
  return path.startsWith(`${tutorId}/`) && !path.includes('..') && !path.includes('?') && !path.includes('#') && path.length > tutorId.length + 1 ? path : null
}
