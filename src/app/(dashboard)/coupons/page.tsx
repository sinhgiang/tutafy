import { requireFeature } from '@/lib/guard'
import { CouponsClient } from './CouponsClient'

export default async function CouponsPage() {
  const locked = await requireFeature('pro', 'Coupons')
  if (locked) return locked
  return <CouponsClient />
}
