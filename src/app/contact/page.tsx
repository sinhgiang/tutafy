import Link from 'next/link'
import { ArrowLeft, Mail, MessageCircle, HelpCircle } from 'lucide-react'
import { pageMetadata, PAGE_SEO } from '@/lib/page-meta'
import { jsonLdScript, pageJsonLd } from '@/lib/seo'
import { SiteFooter } from '@/components/SiteFooter'
import { ContactEmails } from '@/components/ContactEmails'
import { CONTACT_EMAILS, PRIMARY_CONTACT_EMAIL, REPLY_PROMISE } from '@/lib/contact'
import { SiteLogo } from '@/components/SiteLogo'

export const metadata = pageMetadata('contact')

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {pageJsonLd(PAGE_SEO.contact, 'Contact', 'ContactPage').map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(d) }} />)}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <SiteLogo />
          <Link href="/" className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-[34px] font-extrabold text-gray-900 tracking-tight">Get in touch</h1>
          <p className="text-[16px] text-gray-500 mt-3 max-w-lg mx-auto">
            Tutafy is software that helps independent tutors and small tutoring centers run their whole business
            in one place. We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <Mail className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-[14px] font-bold text-gray-900">Email us</p>
            <p className="text-[12px] text-gray-500 mt-1">Support & general questions</p>
            {CONTACT_EMAILS.map(email => (
              <a key={email} href={`mailto:${email}`} className="block text-[12px] font-semibold text-indigo-600 mt-2 break-all hover:underline">{email}</a>
            ))}
          </div>
          {[
            { icon: HelpCircle, title: 'Help', desc: 'Read the FAQ on our homepage', action: 'View FAQ', href: '/#how' },
            { icon: MessageCircle, title: 'Feedback', desc: 'Tell us what to build next', action: 'Send feedback', href: `mailto:${PRIMARY_CONTACT_EMAIL}?subject=Tutafy%20feedback` },
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
            <ContactEmails linkClassName="font-semibold text-indigo-600 underline" />.
            {' '}{REPLY_PROMISE}
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
