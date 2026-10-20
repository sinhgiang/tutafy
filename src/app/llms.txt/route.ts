import { buildLlmsTxt } from '@/lib/llms'
import { llmsResponse } from '@/lib/llms-response'

// Built once at deploy time: prices and the blog list come from the same code the pages use.
export const dynamic = 'force-static'

export function GET() {
  return llmsResponse(buildLlmsTxt())
}
