import { requireFeature } from '@/lib/guard'
import { AiToolsClient } from './AiToolsClient'

export default async function AIToolsPage() {
  const locked = await requireFeature('pro', 'AI Tools')
  if (locked) return locked
  return <AiToolsClient />
}
