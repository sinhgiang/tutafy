import { getDirectory } from '@/lib/directory-cache'
import { refreshCards } from '@/lib/directory'
import { pickLanguagePages } from '@/lib/language-pages'
import { pickPairPages } from '@/lib/niche-pages'
import { buildLlmsLanguagesTxt } from '@/lib/llms-languages'
import { llmsResponse } from '@/lib/llms-response'

// Not built at deploy time like /llms.txt: which languages have a page depends on the tutors who can be booked, so it is read about every hour.
export const revalidate = 3600

export async function GET() {
  const directory = await getDirectory()
  const cards = directory?.open ? refreshCards(directory.cards, new Date()) : []
  return llmsResponse(buildLlmsLanguagesTxt(pickLanguagePages(cards), cards, directory?.asOf ?? null, pickPairPages(cards)))
}
