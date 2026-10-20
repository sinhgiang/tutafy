// What the admin Buyers page reads from the tutors table. The client is passed
// in (the service-role client, from a page that already passed the admin gate),
// so the node tests can hand in a fake. Read-only; no columns are added.

export const BUYERS_LIST_LIMIT = 500

export type BuyerRow = {
  id: string
  name: string
  email: string
  created_at: string
  subscription_status: string
  timezone: string | null
  students: { count: number }[]
  lessons: { count: number }[]
}

// Only the part of the Supabase client this file calls.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BuyersClient = { from(table: string): any }

export async function loadBuyers(admin: BuyersClient) {
  const countPlan = (plan: string): PromiseLike<{ count: number | null }> =>
    admin.from('tutors').select('id', { count: 'exact', head: true }).eq('subscription_status', plan)

  const [pro, academy, list] = await Promise.all([
    countPlan('pro'),
    countPlan('academy'),
    admin.from('tutors')
      .select('id, name, email, created_at, subscription_status, timezone, students(count), lessons(count)')
      .in('subscription_status', ['pro', 'academy'])
      .order('created_at', { ascending: false })
      .limit(BUYERS_LIST_LIMIT) as PromiseLike<{ data: BuyerRow[] | null }>,
  ])
  const proCount = pro.count ?? 0
  const academyCount = academy.count ?? 0
  return {
    pro: proCount,
    academy: academyCount,
    total: proCount + academyCount,
    buyers: list.data ?? [],
  }
}
