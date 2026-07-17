import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using Tutafy.',
}

const UPDATED = 'July 7, 2026'

export default function TermsPage() {
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

      <article className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-[32px] font-extrabold text-gray-900 tracking-tight">Terms of Service</h1>
        <p className="text-[13px] text-gray-400 mt-1 mb-8">Last updated: {UPDATED}</p>

        <div className="space-y-7 text-[14px] text-gray-600 leading-relaxed">
          <p>These terms govern your use of Tutafy. By creating an account, you agree to them.</p>

          <Section title="1. Your account">
            <p>You must provide accurate information and keep your login secure. You are responsible for activity under your account. You must be at least 18 years old to create a tutor account.</p>
          </Section>

          <Section title="2. Acceptable use">
            <p>Use Tutafy for lawful tutoring and business purposes only. Don&apos;t abuse, disrupt, reverse-engineer or resell the service, or upload unlawful content. Respect the privacy of the students whose data you manage.</p>
          </Section>

          <Section title="3. Your data & content">
            <p>You own the student and business data you add. You grant us the limited rights needed to host and provide the service. You are responsible for having the right to store the data you upload and for any consent required from students or parents.</p>
          </Section>

          <Section title="4. Payments">
            <p>Payments between you and your students are processed by third-party providers (Stripe, PayPal, Paddle) and go directly to you — Tutafy takes 0% commission on your income. Paid Tutafy plans (Pro, Academy) are billed via Polar and can be cancelled anytime; fees already paid are non-refundable unless required by law.</p>
          </Section>

          <Section title="5. Service availability">
            <p>We work to keep Tutafy reliable but provide it &quot;as is&quot; without guarantees of uninterrupted availability. We may update or improve features over time.</p>
          </Section>

          <Section title="6. Limitation of liability">
            <p>To the extent permitted by law, Tutafy is not liable for indirect or consequential damages, or for losses beyond the amount you paid us in the prior 12 months.</p>
          </Section>

          <Section title="7. Termination">
            <p>You can cancel or delete your account anytime. We may suspend accounts that violate these terms.</p>
          </Section>

          <Section title="8. Changes">
            <p>We may update these terms; we&apos;ll post the new date here and, for material changes, notify you.</p>
          </Section>

          <Section title="9. Contact">
            <p>Questions? Email <a href="mailto:tubxeebyajtube@gmail.com" className="text-indigo-500 hover:underline">tubxeebyajtube@gmail.com</a>.</p>
          </Section>

          <p className="text-[12px] text-gray-400 border-t border-gray-100 pt-6">These terms are provided for transparency and to meet advertising and app-store requirements. They are not legal advice; please have a lawyer review them for your jurisdiction before relying on them commercially.</p>
        </div>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[16px] font-bold text-gray-900 mb-2">{title}</h2>
      {children}
    </div>
  )
}
