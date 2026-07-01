'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Users, Gift, Zap, Share2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ReferralPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    referral_code: string
    referral_link: string
    referral_count: number
    credits: number
  } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const share = async () => {
    if (!data) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Tutafy',
          text: 'I use Tutafy to manage my tutoring business. Try it free!',
          url: data.referral_link,
        })
      } catch { /* user cancelled */ }
    } else {
      copy(data.referral_link)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-gray-900">Referral Program</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Invite other tutors and earn free months of Pro</p>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
        <p className="text-[14px] font-bold text-gray-900 mb-4">How it works</p>
        <div className="space-y-3">
          {[
            { icon: Share2, text: 'Share your unique referral link with other tutors' },
            { icon: Users, text: 'When they sign up and subscribe to Pro, you both get rewarded' },
            { icon: Gift, text: 'Earn 1 month free Pro for every successful referral' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <p className="text-[13px] text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {!loading && data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <p className="text-[36px] font-black text-gray-900">{data.referral_count}</p>
            <p className="text-[12px] text-gray-400 mt-1">Tutors referred</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Zap className="h-5 w-5 text-indigo-500" fill="currentColor" />
              <p className="text-[36px] font-black text-indigo-600">{data.credits}</p>
            </div>
            <p className="text-[12px] text-gray-400">Free months earned</p>
          </div>
        </div>
      )}

      {/* Referral link */}
      {!loading && data && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-[14px] font-bold text-gray-900">Your Referral Link</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-[12px] text-indigo-600 font-mono flex-1 truncate">{data.referral_link}</p>
            <button
              onClick={() => copy(data.referral_link)}
              className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={share}
              className="flex-1 flex items-center justify-center gap-2 text-[13px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 py-2.5 rounded-xl transition-colors"
            >
              <Share2 className="h-4 w-4" /> Share Link
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            Your referral code: <span className="font-mono font-semibold text-gray-600">{data.referral_code}</span>
          </p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
