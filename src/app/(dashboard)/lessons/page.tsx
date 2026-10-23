// Lessons (T-0822): search by student, filters (status, payment, upcoming or past, one student), sort, 25 rows a page,
// bulk mark paid or completed, CSV export. Reads the signed-in tutor's own lessons only (tutor_id from the session).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, CircleAlert, Download, Plus, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { loadTutorCurrency } from '@/lib/tutor-currency'
import { ListPager } from '@/components/lists/ListPager'
import { hrefWith, rangeOfPage } from '@/lib/list-params'
import {
  LESSON_COLUMNS, LESSON_DEFAULTS, L_PAYMENTS, L_SORTS, L_SORT_LABEL, L_STATUSES, L_WHEN, applyLessonFilters, matchingStudentIds, parseLessonFilters, type LessonRow,
} from '@/lib/lesson-list'
import { LessonsClient } from './LessonsClient'

const label = (v: string) => v === 'all' ? 'All' : v === 'no_show' ? 'No show' : v[0].toUpperCase() + v.slice(1)

export default async function LessonsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseLessonFilters(await searchParams)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const ids = await matchingStudentIds(supabase, user.id, f.q)
  const [from, to] = rangeOfPage(f.page)
  const nobody = ids !== null && ids.length === 0
  const { data, error, count } = nobody
    ? { data: [] as LessonRow[], error: null, count: 0 }
    : await applyLessonFilters(supabase.from('lessons').select(LESSON_COLUMNS, { count: 'exact' }).eq('tutor_id', user.id), f, now, ids).range(from, to)
  const { count: all } = await supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id)
  const currency = await loadTutorCurrency(supabase, user.id)

  const current = { q: f.q, status: f.status, pay: f.pay, when: f.when, sort: f.sort, student: f.student, page: String(f.page) }
  const href = (patch: Record<string, string | number | null>) => hrefWith('/lessons', current, patch, LESSON_DEFAULTS)
  const exportHref = `/api/lessons/export${hrefWith('', current, { page: null }, LESSON_DEFAULTS)}`
  const filtered = f.q !== '' || f.status !== 'all' || f.pay !== 'all' || f.when !== 'all' || f.student !== ''

  const head = (
    <div className="dash-head">
      <div><h1>Lessons</h1><p>{all ?? 0} in total. Select lessons to update them together.</p></div>
      <div className="dash-head-actions"><Link href="/lessons/new" className="dash-btn is-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Schedule lesson</Link></div>
    </div>
  )

  if (error) {
    return (
      <div>
        {head}
        <div className="dash-card dash-state" role="alert" data-testid="lessons-error">
          <div className="dash-state-ico"><CircleAlert className="h-6 w-6" aria-hidden="true" /></div>
          <h2>We could not load your lessons</h2>
          <p>Nothing was changed. Check your connection and try again.</p>
          <div className="dash-state-actions"><Link href={href({})} className="dash-btn is-primary"><RotateCw className="h-4 w-4" aria-hidden="true" /> Try again</Link></div>
        </div>
      </div>
    )
  }

  if ((all ?? 0) === 0) {
    return (
      <div>
        {head}
        <div className="dash-card dash-state" data-testid="lessons-empty">
          <div className="dash-state-ico is-brand"><BookOpen className="h-6 w-6" aria-hidden="true" /></div>
          <h2>No lessons yet</h2>
          <p>Schedule your first lesson or share your booking link.</p>
          <div className="dash-state-actions"><Link href="/lessons/new" className="dash-btn is-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Schedule a lesson</Link></div>
        </div>
      </div>
    )
  }

  const rows = (data ?? []) as unknown as LessonRow[]
  return (
    <div>
      {head}
      <section className="dash-card" aria-label="Lesson list">
        <div className="dash-toolbar">
          <form method="get" action="/lessons" role="search">
            <input className="dash-input" type="search" name="q" defaultValue={f.q} placeholder="Search by student" aria-label="Search lessons by student" maxLength={60} />
            <select className="dash-select" name="when" defaultValue={f.when} aria-label="When">
              {L_WHEN.map(v => <option key={v} value={v}>{v === 'all' ? 'Any time' : label(v)}</option>)}
            </select>
            <select className="dash-select" name="status" defaultValue={f.status} aria-label="Lesson status">
              {L_STATUSES.map(v => <option key={v} value={v}>{v === 'all' ? 'All statuses' : label(v)}</option>)}
            </select>
            <select className="dash-select" name="pay" defaultValue={f.pay} aria-label="Payment status">
              {L_PAYMENTS.map(v => <option key={v} value={v}>{v === 'all' ? 'All payments' : label(v)}</option>)}
            </select>
            <select className="dash-select" name="sort" defaultValue={f.sort} aria-label="Sort by">
              {L_SORTS.map(v => <option key={v} value={v}>{L_SORT_LABEL[v]}</option>)}
            </select>
            {f.student && <input type="hidden" name="student" value={f.student} />}
            <button type="submit" className="dash-btn is-primary">Apply</button>
          </form>
          <div className="dash-toolbar-right">
            {filtered && <Link href="/lessons" className="dash-btn is-ghost">Clear filters</Link>}
            <a className="dash-btn" href={exportHref} data-testid="export-csv"><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</a>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="dash-state" data-testid="lessons-nomatch">
            <h2>{f.page > 1 ? 'That page is empty' : 'No lessons match'}</h2>
            <p>{f.page > 1 ? 'There are fewer lessons than that.' : 'Try a different word, or clear the filters.'}</p>
            <div className="dash-state-actions"><Link href={f.page > 1 ? href({ page: 1 }) : '/lessons'} className="dash-btn">{f.page > 1 ? 'Go to page 1' : 'Clear filters'}</Link></div>
          </div>
        ) : <LessonsClient rows={rows} currency={currency} />}
        <ListPager total={count ?? 0} page={f.page} hrefFor={p => href({ page: p })} noun="lessons" />
      </section>
    </div>
  )
}
