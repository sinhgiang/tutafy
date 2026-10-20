import { normalizeCurrency } from '@/lib/currency'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a Supabase client, whose chained builder is not worth typing here
type Db = { from: (table: string) => any }

/**
 * The currency a tutor's lessons are priced in: their own `tutors.currency`, the same column the
 * booking page shows the student and the card checkout charges in. Never `lessons.currency`.
 */
export async function loadTutorCurrency(db: Db, tutorId: string): Promise<string> {
  const { data } = await db.from('tutors').select('currency').eq('id', tutorId).maybeSingle()
  return normalizeCurrency(data?.currency)
}
