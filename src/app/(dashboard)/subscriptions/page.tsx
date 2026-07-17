import { requireFeature } from '@/lib/guard'
import { SubscriptionsClient } from './SubscriptionsClient'

export default async function SubscriptionsPage() {
  const locked = await requireFeature('pro', 'Student Subscriptions')
  if (locked) return locked
  return <SubscriptionsClient />
}
