import { buildLlmsFullTxt } from '@/lib/llms'
import { llmsResponse } from '@/lib/llms-response'

export const dynamic = 'force-static'

export function GET() {
  return llmsResponse(buildLlmsFullTxt())
}
