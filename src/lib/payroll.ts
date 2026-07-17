// Payroll is computed from completed lessons assigned to each team member and
// that member's pay rule. Tutafy never moves money (students pay tutors directly),
// so this is an earnings/split REPORT the Academy owner uses to pay their team —
// pure computation, no external calls, fully deterministic.

export type PayType = 'per_lesson' | 'per_hour' | 'revenue_share'

export interface PayrollMember {
  id: string
  name: string
  pay_type: PayType
  pay_rate: number // dollars per lesson/hour, or a percent (0-100) for revenue_share
}

export interface PayrollLesson {
  assigned_to?: string | null
  status?: string | null
  price?: number | null
  duration_minutes?: number | null
}

export interface PayrollRow {
  memberId: string
  name: string
  payType: PayType
  payRate: number
  lessons: number
  hours: number
  revenue: number     // gross revenue of their assigned completed lessons
  earnings: number    // what the tutor is owed
  companyShare: number // what the Academy keeps (revenue - earnings, never < 0)
}

export interface PayrollResult {
  rows: PayrollRow[]
  totals: { lessons: number; hours: number; revenue: number; earnings: number; companyShare: number }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function memberEarnings(member: PayrollMember, lessons: number, hours: number, revenue: number): number {
  const rate = Number(member.pay_rate) || 0
  switch (member.pay_type) {
    case 'per_lesson': return round2(rate * lessons)
    case 'per_hour': return round2(rate * hours)
    case 'revenue_share': return round2((Math.min(100, Math.max(0, rate)) / 100) * revenue)
    default: return 0
  }
}

// Only completed lessons count toward pay. Lessons not assigned to any member are
// ignored (they belong to the owner). Earnings are capped so a mis-set per-lesson
// rate can never make companyShare negative beyond the revenue actually earned.
export function computePayroll(members: PayrollMember[], lessons: PayrollLesson[]): PayrollResult {
  const byMember = new Map<string, { lessons: number; hours: number; revenue: number }>()
  for (const m of members) byMember.set(m.id, { lessons: 0, hours: 0, revenue: 0 })

  for (const l of lessons) {
    if (l.status !== 'completed') continue
    if (!l.assigned_to || !byMember.has(l.assigned_to)) continue
    const acc = byMember.get(l.assigned_to)!
    acc.lessons += 1
    acc.hours += (Number(l.duration_minutes) || 0) / 60
    acc.revenue += Number(l.price) || 0
  }

  const rows: PayrollRow[] = members.map(m => {
    const acc = byMember.get(m.id)!
    const hours = round2(acc.hours)
    const revenue = round2(acc.revenue)
    const earnings = memberEarnings(m, acc.lessons, hours, revenue)
    const companyShare = round2(Math.max(0, revenue - earnings))
    return {
      memberId: m.id, name: m.name, payType: m.pay_type, payRate: Number(m.pay_rate) || 0,
      lessons: acc.lessons, hours, revenue, earnings, companyShare,
    }
  })

  const totals = rows.reduce((t, r) => ({
    lessons: t.lessons + r.lessons,
    hours: round2(t.hours + r.hours),
    revenue: round2(t.revenue + r.revenue),
    earnings: round2(t.earnings + r.earnings),
    companyShare: round2(t.companyShare + r.companyShare),
  }), { lessons: 0, hours: 0, revenue: 0, earnings: 0, companyShare: 0 })

  return { rows, totals }
}
