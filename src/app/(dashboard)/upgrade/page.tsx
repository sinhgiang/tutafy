import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Check, X, Zap, Crown, Users } from 'lucide-react'
import Link from 'next/link'

const PRO_URL = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_PRO ?? '#'
const ACADEMY_URL = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_ACADEMY ?? '#'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    per: '',
    desc: 'Để bắt đầu thử nghiệm',
    color: 'bg-white border-gray-200',
    headerColor: 'text-gray-900',
    priceColor: 'text-gray-900',
    icon: null,
    cta: null,
    ctaStyle: '',
    features: [
      { text: 'Tối đa 10 học sinh', ok: true },
      { text: '1 tutor', ok: true },
      { text: 'Booking page', ok: true },
      { text: 'Lịch dạy & reminders', ok: true },
      { text: 'Analytics cơ bản', ok: true },
      { text: 'AI Tools', ok: false },
      { text: 'Payment links (PayPal/Paddle)', ok: false },
      { text: 'Nhiều hơn 10 học sinh', ok: false },
      { text: 'Nhiều tutor (team)', ok: false },
      { text: 'Priority support', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    per: '/tháng',
    desc: 'Cho tutor chuyên nghiệp',
    color: 'bg-indigo-500 border-indigo-500',
    headerColor: 'text-indigo-200',
    priceColor: 'text-white',
    icon: Zap,
    badge: 'Phổ biến nhất',
    badgeColor: 'bg-white/20 text-white',
    cta: 'Nâng cấp Pro',
    ctaStyle: 'bg-white text-indigo-600 hover:bg-indigo-50',
    checkoutUrl: PRO_URL,
    features: [
      { text: 'Học sinh không giới hạn', ok: true },
      { text: '1 tutor', ok: true },
      { text: 'Booking page', ok: true },
      { text: 'Lịch dạy & reminders', ok: true },
      { text: 'Analytics đầy đủ', ok: true },
      { text: 'AI Tools (lập kế hoạch, nội dung)', ok: true },
      { text: 'Payment links (PayPal/Paddle/Stripe)', ok: true },
      { text: 'Học sinh không giới hạn', ok: true },
      { text: 'Nhiều tutor (team)', ok: false },
      { text: 'Priority support', ok: false },
    ],
  },
  {
    id: 'academy',
    name: 'Academy',
    price: 29,
    per: '/tháng',
    desc: 'Cho trung tâm & nhóm tutor',
    color: 'bg-white border-gray-200',
    headerColor: 'text-gray-500',
    priceColor: 'text-gray-900',
    icon: Users,
    cta: 'Nâng cấp Academy',
    ctaStyle: 'bg-gray-900 text-white hover:bg-gray-800',
    checkoutUrl: ACADEMY_URL,
    features: [
      { text: 'Học sinh không giới hạn', ok: true },
      { text: 'Tối đa 5 tutors (team)', ok: true },
      { text: 'Booking page riêng từng tutor', ok: true },
      { text: 'Lịch dạy & reminders', ok: true },
      { text: 'Analytics đầy đủ + team report', ok: true },
      { text: 'AI Tools', ok: true },
      { text: 'Payment links (PayPal/Paddle/Stripe)', ok: true },
      { text: 'Học sinh không giới hạn', ok: true },
      { text: 'Tối đa 5 tutors (team)', ok: true },
      { text: 'Priority support', ok: true },
    ],
  },
]

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tutor } = await supabase
    .from('tutors')
    .select('subscription_status, name')
    .eq('id', user.id)
    .single()

  const currentPlan = tutor?.subscription_status ?? 'free'
  const tutorName = tutor?.name?.split(' ')[0] ?? 'bạn'

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-[12px] font-bold px-4 py-1.5 rounded-full mb-4">
          <Zap className="h-3.5 w-3.5" fill="currentColor" />
          Chọn gói phù hợp
        </div>
        <h1 className="text-[32px] font-bold text-gray-900">Nâng cấp Tutafy</h1>
        <p className="text-[14px] text-gray-500 mt-2">
          Hiện tại bạn đang dùng gói <span className="font-semibold capitalize text-gray-700">{currentPlan}</span>
          {currentPlan !== 'free' && <span className="text-emerald-600"> ✓</span>}
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {PLANS.map(plan => {
          const isActive = currentPlan === plan.id
          const Icon = plan.icon

          return (
            <div key={plan.id}
              className={`relative rounded-2xl border-2 overflow-hidden ${plan.color} ${isActive ? 'ring-4 ring-indigo-300' : ''}`}>

              {/* Badge */}
              {'badge' in plan && (
                <div className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full ${plan.badgeColor}`}>
                  {plan.badge}
                </div>
              )}

              {isActive && (
                <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600">
                  Gói hiện tại
                </div>
              )}

              <div className="p-6">
                {/* Plan name */}
                <div className="flex items-center gap-2 mb-1">
                  {Icon && <Icon className={`h-4 w-4 ${plan.id === 'pro' ? 'text-indigo-200' : 'text-gray-500'}`} />}
                  <p className={`text-[12px] font-bold uppercase tracking-widest ${plan.headerColor}`}>
                    {plan.name}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-[36px] font-black leading-none ${plan.priceColor}`}>
                    {plan.price === 0 ? '$0' : `$${plan.price}`}
                  </span>
                  {plan.per && (
                    <span className={`text-[13px] pb-1 ${plan.id === 'pro' ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {plan.per}
                    </span>
                  )}
                </div>
                <p className={`text-[12px] mb-6 ${plan.id === 'pro' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {plan.desc}
                </p>

                {/* CTA button */}
                {isActive ? (
                  <div className={`w-full py-2.5 rounded-xl text-[13px] font-bold text-center ${
                    plan.id === 'pro' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    Gói hiện tại ✓
                  </div>
                ) : plan.cta ? (
                  <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer"
                    className={`block w-full py-2.5 rounded-xl text-[13px] font-bold text-center transition-colors ${plan.ctaStyle}`}>
                    {plan.cta} →
                  </a>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-[13px] font-bold text-center bg-gray-100 text-gray-400">
                    Miễn phí
                  </div>
                )}
              </div>

              {/* Feature list */}
              <div className={`px-6 pb-6 space-y-2.5 border-t pt-5 ${plan.id === 'pro' ? 'border-indigo-400' : 'border-gray-100'}`}>
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {f.ok ? (
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        plan.id === 'pro' ? 'bg-white/20' : 'bg-emerald-100'
                      }`}>
                        <Check className={`h-2.5 w-2.5 ${plan.id === 'pro' ? 'text-white' : 'text-emerald-600'}`} />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                        <X className="h-2.5 w-2.5 text-gray-300" />
                      </div>
                    )}
                    <span className={`text-[12px] ${
                      f.ok
                        ? (plan.id === 'pro' ? 'text-white' : 'text-gray-700')
                        : (plan.id === 'pro' ? 'text-indigo-300' : 'text-gray-300')
                    }`}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Payment note */}
      <div className="bg-gray-50 rounded-2xl p-6 text-center mb-6">
        <p className="text-[13px] text-gray-600 font-medium mb-1">Thanh toán an toàn qua Polar.sh</p>
        <p className="text-[12px] text-gray-400">
          Hỗ trợ Visa, Mastercard, PayPal · Hủy bất kỳ lúc nào · Không phí ẩn
        </p>
        <p className="text-[11px] text-gray-400 mt-3">
          Sau khi thanh toán, tài khoản của bạn sẽ được nâng cấp tự động trong vài phút.
          Nếu sau 10 phút chưa thấy thay đổi, email <strong>tubxeebyajtube@gmail.com</strong>
        </p>
      </div>

      {/* FAQ mini */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {[
          { q: 'Có thể hủy bất kỳ lúc nào không?', a: 'Có. Hủy trong Polar.sh, không bị tính phí tháng sau.' },
          { q: 'Nâng cấp có mất dữ liệu không?', a: 'Không. Toàn bộ học sinh, bài học đều được giữ nguyên.' },
          { q: 'Tôi có thể đổi gói không?', a: 'Có. Upgrade/downgrade bất kỳ lúc nào, tính phí theo tỷ lệ ngày.' },
          { q: 'Hỗ trợ thanh toán nào?', a: 'Visa, Mastercard, PayPal, và nhiều phương thức địa phương.' },
        ].map(item => (
          <div key={item.q} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[13px] font-semibold text-gray-900 mb-1">{item.q}</p>
            <p className="text-[12px] text-gray-500">{item.a}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link href="/settings" className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors">
          ← Quay lại Settings
        </Link>
      </div>
    </div>
  )
}
