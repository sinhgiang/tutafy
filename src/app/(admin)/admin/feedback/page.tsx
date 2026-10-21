import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminPage } from '@/lib/admin-guard'
import { getAdminT } from '@/lib/admin-lang'
import { loadFeedback, FEEDBACK_LIST_LIMIT } from '@/lib/feedback-data'
import { FEEDBACK_KINDS, type FeedbackKind } from '@/lib/feedback'
import type { AdminKey } from '@/lib/admin-i18n'
import { MessageSquare, Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

const KIND_KEY: Record<FeedbackKind, AdminKey> = {
  bug: 'feedback.kind.bug',
  idea: 'feedback.kind.idea',
  question: 'feedback.kind.question',
}
const KIND_BADGE: Record<FeedbackKind, string> = {
  bug: 'bg-red-50 text-red-700',
  idea: 'bg-indigo-50 text-indigo-700',
  question: 'bg-amber-50 text-amber-700',
}
const ROLE_KEY: Record<'tutor' | 'student', AdminKey> = { tutor: 'feedback.role.tutor', student: 'feedback.role.student' }

export default async function AdminFeedbackPage() {
  // Own check, before any query: this page reads what every tutor and student wrote, with the service-role key.
  await requireAdminPage()
  const { t } = await getAdminT()

  const { counts, total, rows, failed } = await loadFeedback(createAdminClient())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('feedback.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('feedback.subtitle')}</p>
      </div>

      {failed && (
        <div data-testid="feedback-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {t('feedback.error')}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">{t('feedback.total')}</p>
            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <p data-testid="feedback-total" className="text-3xl font-bold text-gray-900">{failed ? '—' : total}</p>
        </div>
        {FEEDBACK_KINDS.map(kind => (
          <div key={kind} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center h-9 mb-1"><p className="text-sm text-gray-500">{t(KIND_KEY[kind])}</p></div>
            <p data-testid={`feedback-count-${kind}`} className="text-3xl font-bold text-gray-900">{failed ? '—' : counts[kind]}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* A phone: one card per message, so the text is read without scrolling sideways */}
        <ul className="md:hidden divide-y divide-gray-100">
          {rows.length === 0 && !failed && <li className="text-center py-10 text-gray-400 text-sm">{t('feedback.empty')}</li>}
          {rows.map(r => (
            <li key={r.id} data-testid="feedback-card" className="px-4 py-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KIND_BADGE[r.kind] ?? KIND_BADGE.idea}`}>{t(KIND_KEY[r.kind] ?? KIND_KEY.idea)}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{r.message}</p>
              <a href={`mailto:${r.author_email}`} title={t('feedback.reply')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 min-w-0">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="shrink-0">{t(ROLE_KEY[r.author_role] ?? ROLE_KEY.student)}:</span>
                <span className="truncate">{r.author_email}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500 whitespace-nowrap">{t('feedback.colWhen')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('feedback.colFrom')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('feedback.colType')}</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">{t('feedback.colMessage')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 && !failed && (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400">{t('feedback.empty')}</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} data-testid="feedback-row" className="align-top hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <p className="text-xs text-gray-400">{t(ROLE_KEY[r.author_role] ?? ROLE_KEY.student)}</p>
                    <a href={`mailto:${r.author_email}`} title={t('feedback.reply')} className="inline-flex items-center gap-1 text-gray-700 hover:text-indigo-600 max-w-[20rem]">
                      <Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate" title={r.author_email}>{r.author_email}</span>
                    </a>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KIND_BADGE[r.kind] ?? KIND_BADGE.idea}`}>{t(KIND_KEY[r.kind] ?? KIND_KEY.idea)}</span>
                  </td>
                  {/* the text is what a stranger typed: shown as plain text, line breaks kept, never as HTML */}
                  <td className="px-5 py-3 text-gray-800 whitespace-pre-wrap break-words min-w-[16rem]">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > rows.length && !failed && (
          <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-50">{t('feedback.cut', { limit: FEEDBACK_LIST_LIMIT, total })}</p>
        )}
      </div>
    </div>
  )
}
