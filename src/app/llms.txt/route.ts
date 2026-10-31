import { buildLlmsTxt } from '@/lib/llms'
import { llmsResponse } from '@/lib/llms-response'

// Built at deploy time and again about every hour: prices and the blog list come from the same code the pages use, and a post is listed from its day (T-1222).
export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  return llmsResponse(buildLlmsTxt())
}
