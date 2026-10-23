import { NextResponse } from 'next/server'
import { getDirectory } from '@/lib/directory-cache'
import { refreshCards } from '@/lib/directory'

// The tutors a student can book today (T-0769): the same list the /tutors page draws, from the same rule (src/lib/directory.ts).
// Public and read only. Each tutor is a fixed set of keys (CARD_KEYS): never an email, a phone number or a payment field.
// A failed read answers 503, not an empty list that would look like "no tutors". The answer may be shared by caches for a few minutes.
// While fewer than DIRECTORY_OPENS_AT tutors are listed (T-0803) `tutors` is empty and `open` is false; `listed` still says how many there are.
export const dynamic = 'force-dynamic'

export async function GET() {
  const directory = await getDirectory()
  if (!directory) {
    return NextResponse.json({ error: 'The tutor list could not be loaded. Please try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json(
    { tutors: refreshCards(directory.cards, new Date()), listed: directory.listed, open: directory.open, truncated: directory.truncated },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  )
}
