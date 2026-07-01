import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { PrintButton } from './PrintButton'

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ token: string; lessonId: string }>
}) {
  const { token, lessonId } = await params
  const supabase = createAdminClient()

  const { data: student } = await supabase
    .from('students')
    .select('id, name, status')
    .eq('portal_token', token)
    .single()

  if (!student || student.status === 'inactive') notFound()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, starts_at, duration_minutes, status, tutors(name)')
    .eq('id', lessonId)
    .eq('student_id', student.id)
    .single()

  if (!lesson || lesson.status !== 'completed') notFound()

  const tutor = lesson.tutors as any
  const date = new Date(lesson.starts_at)
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const hours = (lesson.duration_minutes / 60).toFixed(1).replace('.0', '')
  const certId = lessonId.slice(0, 8).toUpperCase()
  const issuedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .cert-wrap { padding: 0 !important; min-height: auto !important; }
          .cert { box-shadow: none !important; max-width: 100% !important; page-break-inside: avoid; }
        }
      `}</style>

      <PrintButton />

      <div className="cert-wrap min-h-screen bg-[#f5f3ef] flex items-center justify-center p-10">
        <div className="cert bg-white border-2 border-indigo-500 rounded-sm max-w-[760px] w-full px-16 py-14 shadow-2xl relative">

          {/* Inner border */}
          <div className="absolute inset-2 border border-indigo-100 rounded-sm pointer-events-none" />

          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
              </svg>
            </div>
            <span className="text-[18px] font-black text-gray-900 tracking-tight">Tutafy</span>
          </div>

          {/* Title row */}
          <p className="text-center text-[11px] font-black text-indigo-500 tracking-[0.2em] uppercase mb-2">
            Certificate of Completion
          </p>
          <hr className="border-t border-gray-200 w-20 mx-auto mb-8" />

          <p className="text-center text-[22px] text-gray-700 font-serif mb-5 italic">This is to certify that</p>

          {/* Student name */}
          <p className="text-center text-[44px] text-indigo-600 font-serif italic border-b border-gray-200 pb-3 mx-auto max-w-[500px] mb-8">
            {student.name}
          </p>

          {/* Body text */}
          <p className="text-center text-[14px] text-gray-600 leading-[1.9] max-w-[480px] mx-auto mb-10">
            has successfully completed a{' '}
            <strong className="text-gray-800">{lesson.duration_minutes}-minute language lesson</strong>{' '}
            with instructor{' '}
            <strong className="text-gray-800">{tutor?.name ?? 'your tutor'}</strong>{' '}
            on{' '}
            <strong className="text-gray-800">{dateLabel}</strong>.
            <br /><br />
            This certificate is awarded in recognition of their commitment to language learning.
          </p>

          {/* Meta strip */}
          <div className="flex justify-center gap-12 mb-10">
            {[
              { label: 'Date', value: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              { label: 'Duration', value: `${hours} hour${hours === '1' ? '' : 's'}` },
              { label: 'Instructor', value: tutor?.name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{label}</p>
                <p className="text-[13px] font-semibold text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {/* Seal */}
          <div className="flex justify-center mb-10">
            <div className="w-20 h-20 rounded-full border-[3px] border-indigo-500 bg-indigo-50 flex flex-col items-center justify-center">
              <p className="text-[8px] font-black text-indigo-600 uppercase tracking-wider text-center leading-tight">
                Tutafy<br/>Verified
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-around pt-6 border-t border-gray-100">
            {[
              { name: tutor?.name ?? '—', role: 'Instructor' },
              { name: 'Tutafy Platform', role: `Issued ${issuedDate}` },
            ].map(({ name, role }) => (
              <div key={role} className="text-center">
                <p className="text-[13px] font-semibold text-gray-700 mb-2">{name}</p>
                <div className="w-40 border-t border-gray-300 mx-auto mb-1.5" />
                <p className="text-[10px] text-gray-400">{role}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-gray-300 mt-8">
            tutafy.vercel.app · Certificate ID: {certId}
          </p>
        </div>
      </div>
    </>
  )
}
