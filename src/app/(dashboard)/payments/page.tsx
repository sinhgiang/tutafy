import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  free: 'bg-gray-100 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*, students(name)')
    .eq('tutor_id', user!.id)
    .not('price', 'is', null)
    .order('starts_at', { ascending: false })

  const total = lessons?.filter(l => l.payment_status === 'paid').reduce((s, l) => s + (l.price ?? 0), 0) ?? 0
  const pending = lessons?.filter(l => l.payment_status === 'pending').reduce((s, l) => s + (l.price ?? 0), 0) ?? 0

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonth = lessons?.filter(l => l.payment_status === 'paid' && new Date(l.starts_at) >= startOfMonth)
    .reduce((s, l) => s + (l.price ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Track your earnings and invoices</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Earned', value: `$${total.toFixed(2)}`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'This Month', value: `$${thisMonth.toFixed(2)}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending', value: `$${pending.toFixed(2)}`, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
        <CardContent>
          {!lessons || lessons.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No payments yet. Lessons with a price will appear here.</p>
          ) : (
            <div className="space-y-1">
              {lessons.map(lesson => (
                <div key={lesson.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lesson.students?.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(lesson.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{lesson.duration_minutes}min
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">${(lesson.price ?? 0).toFixed(2)}</span>
                    <Badge className={statusColors[lesson.payment_status ?? 'pending']} variant="secondary">
                      {lesson.payment_status ?? 'pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Stripe Connect — Coming Soon</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Accept online payments from students directly to your bank account. Currently tracking manual payments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
