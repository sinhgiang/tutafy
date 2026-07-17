'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calculator, ArrowRight } from 'lucide-react'

// Value-first lead magnet: the reader enters their own numbers and instantly
// sees what a marketplace commission costs them per year vs Tutafy's flat price.
// Honest by design — the numbers are the reader's own, nothing is fabricated.
export function CommissionCalculator() {
  const [hours, setHours] = useState(15)
  const [rate, setRate] = useState(25)
  const [commission, setCommission] = useState(25)

  const annual = hours * rate * 52
  const lost = Math.round(annual * (commission / 100))
  const tutafyYear = 144 // Pro, $12/mo
  const netKept = Math.max(0, lost - tutafyYear)
  const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

  const Field = ({ label, value, set, min, max, step, suffix }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; suffix: string }) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-medium text-gray-600">{label}</label>
        <span className="text-[13px] font-bold text-indigo-600">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => set(Number(e.target.value))}
        className="w-full accent-indigo-500" />
    </div>
  )

  return (
    <div className="my-8 bg-white rounded-2xl border border-gray-200 overflow-hidden not-prose">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <Calculator className="h-4 w-4 text-indigo-500" />
        <p className="text-[13px] font-bold text-gray-900">How much are you losing to commission?</p>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="p-5 space-y-4 border-b md:border-b-0 md:border-r border-gray-100">
          <Field label="Hours you teach per week" value={hours} set={setHours} min={1} max={40} step={1} suffix="h" />
          <Field label="Your hourly rate" value={rate} set={setRate} min={5} max={100} step={1} suffix="$" />
          <Field label="Marketplace commission" value={commission} set={setCommission} min={0} max={40} step={1} suffix="%" />
        </div>
        <div className="p-5 flex flex-col justify-center bg-indigo-500 text-white text-center">
          <p className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">You lose to commission</p>
          <p className="text-[36px] font-extrabold leading-none mt-1">{money(lost)}<span className="text-[15px] font-semibold text-indigo-200">/yr</span></p>
          <p className="text-[12px] text-indigo-100 mt-3 leading-relaxed">
            On Tutafy you&apos;d keep it — our Pro plan is just <b className="text-white">$144/year</b> with <b className="text-white">0% commission</b>.
            That&apos;s about <b className="text-white">{money(netKept)}</b> back in your pocket.
          </p>
          <Link href="/register" className="inline-flex items-center justify-center gap-2 mt-4 text-[13px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 transition-colors px-5 py-2.5 rounded-xl">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 px-5 py-2.5 border-t border-gray-100">Estimate based on your inputs. You still pay your normal payment-processor fee (e.g. ~2.9% + 30¢). Tutafy takes 0% of your income.</p>
    </div>
  )
}
