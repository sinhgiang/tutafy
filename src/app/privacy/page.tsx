import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Tutafy collects, uses and protects your data.',
}

const UPDATED = 'July 7, 2026'

export default function PrivacyPage() {
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

      <article className="max-w-3xl mx-auto px-6 py-14 prose-tutafy">
        <h1 className="text-[32px] font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
        <p className="text-[13px] text-gray-400 mt-1 mb-8">Last updated: {UPDATED}</p>

        <div className="space-y-7 text-[14px] text-gray-600 leading-relaxed">
          <p>Tutafy (&quot;we&quot;, &quot;us&quot;) provides software that helps tutors run their tutoring business. This policy explains what we collect, why, and your choices. We keep it short and plain.</p>

          <Section title="Information we collect">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Account data</b> you provide as a tutor: name, email, password, profile details.</li>
              <li><b>Student data</b> you add to run your business: student names, emails, lesson notes, homework, and scheduling details. You are the owner and controller of this data; we process it on your behalf.</li>
              <li><b>Payment data:</b> handled by our payment processors (Stripe, PayPal, Paddle, Polar). We do not store full card numbers.</li>
              <li><b>Usage data:</b> basic logs and analytics to keep the service secure and reliable.</li>
            </ul>
          </Section>

          <Section title="How we use it">
            <p>To provide and improve the service, process payments, send transactional emails and reminders, respond to support requests, and keep the platform secure. We do not sell your data.</p>
          </Section>

          <Section title="Service providers we use">
            <p>We rely on trusted providers to run Tutafy, including Supabase (database &amp; auth), Vercel (hosting), Resend (email), Twilio (SMS), Stripe / PayPal / Paddle / Polar (payments), and Groq (AI features). Each processes data only as needed to provide their service.</p>
          </Section>

          <Section title="Children's data">
            <p>Tutafy is intended for tutors (adults). If, as a tutor, you record data about students under 13, you are responsible for obtaining any required parental consent (e.g. under COPPA). Parents can request access to or deletion of their child&apos;s data by contacting the tutor or us.</p>
          </Section>

          <Section title="Your rights">
            <p>You can access, export, correct or delete your data at any time from your account or by contacting us. Deleting your account removes your data from active systems.</p>
          </Section>

          <Section title="Data retention & security">
            <p>We keep data while your account is active and delete it on request. We use industry-standard security (encryption in transit, access controls). No system is perfectly secure, but we work hard to protect your data.</p>
          </Section>

          <Section title="Cookies & analytics">
            <p>We use <b>essential cookies</b> to keep you signed in and run the app. On our public marketing pages we also use, <b>only with your consent</b>, analytics and advertising cookies to understand how visitors find us and to measure our ads — including Google Analytics / Google Ads and the Meta (Facebook) Pixel. You can accept or decline these in the cookie banner, and change your mind anytime by clearing your browser storage. Declining does not affect your ability to use Tutafy.</p>
          </Section>

          <Section title="International visitors (GDPR / CCPA)">
            <p>If you're in the EU/UK, we process your data on the lawful bases of performing our contract with you and, for analytics/advertising cookies, your consent. If you're in California, we do not sell your personal information. In both cases you can access, correct, delete or export your data — just ask.</p>
          </Section>

          <Section title="Contact">
            <p>Questions about privacy? Email <a href="mailto:tubxeebyajtube@gmail.com" className="text-indigo-500 hover:underline">tubxeebyajtube@gmail.com</a>.</p>
          </Section>

          <p className="text-[12px] text-gray-400 border-t border-gray-100 pt-6">This policy is provided for transparency and to meet advertising and app-store requirements. It is not legal advice; please have a lawyer review it for your jurisdiction before relying on it commercially.</p>
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
