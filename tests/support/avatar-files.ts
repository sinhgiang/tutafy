// Tiny made-up picture files for the profile-photo tests (T-0766). They have the real outer structure of each format (markers, chunks), with a few
// bytes of "picture", so the sniffing and the cleaning run on realistic bytes. Every note hidden in them is the made-up text GPS_NOTE.
export const GPS_NOTE = 'GPS 51.5N 0.12W Example Camera'

const bytes = (...parts: (number[] | string | Uint8Array)[]): Uint8Array => {
  const flat: number[] = []
  for (const p of parts) {
    if (typeof p === 'string') for (const c of p) flat.push(c.charCodeAt(0))
    else flat.push(...p)
  }
  return new Uint8Array(flat)
}

const u16 = (n: number) => [(n >> 8) & 255, n & 255]
const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const u32le = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]

/** The picture data that must come through every cleaning unchanged. */
export const PIXELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/** A JPEG: JFIF header, an EXIF block with the note, a comment with the note, the picture data, the end. */
export function jpeg(withNotes = true): Uint8Array {
  const exif = bytes('Exif\0\0', GPS_NOTE)
  const comment = bytes(GPS_NOTE)
  return bytes(
    [0xff, 0xd8],
    [0xff, 0xe0], u16(16), 'JFIF\0', [1, 1, 0, 0, 1, 0, 1, 0, 0],
    ...(withNotes ? [[0xff, 0xe1], u16(exif.length + 2), exif, [0xff, 0xfe], u16(comment.length + 2), comment, [0xff, 0xed], u16(2 + 6), 'IPTC00'] : []),
    [0xff, 0xdb], u16(4), [0, 8],
    [0xff, 0xda], u16(4), [0, 0], PIXELS,
    [0xff, 0xd9],
  )
}

const pngChunk = (type: string, data: number[] | Uint8Array) => bytes(u32be(data.length), type, Array.from(data), [0, 0, 0, 0]) // the checksum is not checked by the cleaning

/** A PNG: header, a text chunk and an EXIF chunk with the note, the picture data, the end. */
export function png(withNotes = true): Uint8Array {
  return bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    pngChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
    ...(withNotes ? [pngChunk('tEXt', bytes('Comment\0', GPS_NOTE)), pngChunk('eXIf', bytes(GPS_NOTE)), pngChunk('tIME', [7, 234, 10, 22, 12, 0, 0])] : []),
    pngChunk('IDAT', PIXELS),
    pngChunk('IEND', []),
  )
}

const webpChunk = (tag: string, data: number[] | Uint8Array) => bytes(tag, u32le(data.length), Array.from(data), data.length % 2 ? [0] : [])

/** A WebP with the extended header (VP8X, flags for EXIF and XMP set), an EXIF chunk and an XMP chunk with the note, and the picture data. */
export function webp(withNotes = true): Uint8Array {
  const flags = withNotes ? 0x08 | 0x04 | 0x10 : 0x10 // EXIF, XMP and "has alpha"
  const chunks = bytes(
    webpChunk('VP8X', [flags, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    webpChunk('VP8 ', PIXELS),
    ...(withNotes ? [webpChunk('EXIF', bytes(GPS_NOTE)), webpChunk('XMP ', bytes(GPS_NOTE))] : []),
  )
  return bytes('RIFF', u32le(chunks.length + 4), 'WEBP', chunks)
}

export const svg = () => bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
export const gif = () => bytes('GIF89a', [1, 0, 1, 0, 0, 0, 0])
export const html = () => bytes('<html><script>alert(1)</script></html>')

export const toBase64 = (b: Uint8Array) => Buffer.from(b).toString('base64')

export const contains = (haystack: Uint8Array, text: string) => Buffer.from(haystack).includes(Buffer.from(text))
