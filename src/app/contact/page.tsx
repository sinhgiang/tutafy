import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, Mail, MessageCircle, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Tutafy team — support, questions and feedback.',
}

const SUPPORT_EMAIL = 'tubxeebyajtube@gmail.com'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[17px] font-bold text-gray-900">Tutafy</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-[34px] font-extrabold text-gray-900 tracking-tight">Get in touch</h1>
          <p className="text-[16px] text-gray-500 mt-3 max-w-lg mx-auto">
            Tutafy is software that helps independent tutors and small tutoring centers run their whole business
            in one place. We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Mail, title: 'Email us', desc: 'Support & general questions', action: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
            { icon: HelpCircle, title: 'Help', desc: 'Read the FAQ on our homepage', action: 'View FAQ', href: '/#how' },
            { icon: MessageCircle, title: 'Feedback', desc: 'Tell us what to build next', action: 'Send feedback', href: `mailto:${SUPPORT_EMAIL}?subject=Tutafy%20feedback` },
          ].map(c => (
            <a key={c.title} href={c.href} className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                <c.icon className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-[14px] font-bold text-gray-900">{c.title}</p>
              <p className="text-[12px] text-gray-500 mt-1">{c.desc}</p>
              <p className="text-[12px] font-semibold text-indigo-500 mt-2 break-all">{c.action}</p>
            </a>
          ))}
        </div>

        <div className="bg-gray-50 rounded-2xl p-6 text-center">
          <p className="text-[13px] text-gray-600">
            Prefer email? Reach us directly at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-indigo-500 hover:underline">{SUPPORT_EMAIL}</a>.
            We usually reply within one business day.
          </p>
        </div>
      </section>
    </div>
  )
}
