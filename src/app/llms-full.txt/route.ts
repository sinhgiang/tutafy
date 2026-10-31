import { buildLlmsFullTxt } from '@/lib/llms'
import { llmsResponse } from '@/lib/llms-response'

export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  return llmsResponse(buildLlmsFullTxt())
}
