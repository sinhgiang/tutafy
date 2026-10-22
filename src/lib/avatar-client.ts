// Getting a chosen picture ready to upload (T-0766). BROWSER ONLY (it uses a canvas). The picture is drawn again on a canvas and saved as a JPEG
// no wider than 1200 pixels: that applies the way a phone turned the photo (the "orientation" note), drops every hidden note (where it was taken,
// which camera), and brings a 6 MB phone photo down to a few hundred KB. The server checks the result again and does not trust any of this.
import { MAX_AVATAR_BYTES } from '@/lib/avatar-image'

/** The biggest file the browser will even try to read, before it is made smaller. */
export const MAX_PICKED_BYTES = 25 * 1024 * 1024
export const PICKABLE = ['image/jpeg', 'image/png', 'image/webp']
const SIDE = 1200

export type Prepared = { ok: true; base64: string; bytes: number } | { ok: false; error: string }

export function pickProblem(file: { type: string; size: number }): string | null {
  if (!PICKABLE.includes(file.type)) return 'Use a JPG, PNG or WebP photo.'
  if (file.size > MAX_PICKED_BYTES) return 'That photo is too big. Use one under 25 MB.'
  return null
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function prepareAvatar(file: File): Promise<Prepared> {
  const problem = pickProblem(file)
  if (problem) return { ok: false, error: problem }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, error: 'We could not read that photo.' }
    ctx.fillStyle = '#ffffff' // a transparent picture becomes a white background, not a black one
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    for (const quality of [0.9, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality))
      if (blob && blob.size <= MAX_AVATAR_BYTES) return { ok: true, base64: await blobToBase64(blob), bytes: blob.size }
    }
    return { ok: false, error: 'That photo is too big. Use one under 2 MB.' }
  } catch {
    return { ok: false, error: 'We could not read that photo. Use a JPG, PNG or WebP image.' }
  }
}
