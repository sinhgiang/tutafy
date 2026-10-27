// Students (T-0822): search, level and status filters, sort, 25 rows a page, bulk status change, CSV export.
// The page reads the signed-in tutor's own students only (tutor_id from the session) and asks the database for one page.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CircleAlert, Download, Plus, RotateCw, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListPager } from '@/components/lists/ListPager'
import { hrefWith, rangeOfPage } from '@/lib/list-params'
import {
  LEVELS, SORTS, SORT_LABEL, STATUSES, STUDENT_COLUMNS, STUDENT_DEFAULTS, applyStudentFilters, parseStudentFilters, type StudentRow,
} from '@/lib/student-list'
import { StudentsTable } from './StudentsTable'

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const f = parseStudentFilters(sp)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [from, to] = rangeOfPage(f.page)
  const { data, error, count } = await applyStudentFilters(
    supabase.from('students').select(STUDENT_COLUMNS, { count: 'exact' }).eq('tutor_id', user.id), f,
  ).range(from, to)

  // The total of all the tutor's students and the active ones, for the sentence under the title (two cheap counts).
  const [{ count: all }, { count: active }] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('tutor_id', user.id).eq('status', 'active'),
  ])

  const current = { q: f.q, level: f.level, status: f.status, sort: f.sort, page: String(f.page) }
  const href = (patch: Record<string, string | number | null>) => hrefWith('/students', current, patch, STUDENT_DEFAULTS)
  const exportHref = `/api/students/export${hrefWith('', current, { page: null }, STUDENT_DEFAULTS)}`
  const filtered = f.q !== '' || f.level !== 'all' || f.status !== 'all'

  const head = (
    <div className="dash-head">
      <div>
        <h1>Students</h1>
        <p>{all ?? 0} total, {active ?? 0} active</p>
      </div>
      <div className="dash-head-actions">
        <Link href="/students/new" className="dash-btn is-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Add student</Link>
      </div>
    </div>
  )

  if (error) {
    return (
      <div>
        {head}
        <div className="dash-card dash-state" role="alert" data-testid="students-error">
          <div className="dash-state-ico"><CircleAlert className="h-6 w-6" aria-hidden="true" /></div>
          <h2>We could not load your students</h2>
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
        <div className="dash-card dash-state" data-testid="students-empty">
          <div className="dash-state-ico is-brand"><Users className="h-6 w-6" aria-hidden="true" /></div>
          <h2>No students yet</h2>
          <p>Add your first student to start managing your tutoring business.</p>
          <div className="dash-state-actions"><Link href="/students/new" className="dash-btn is-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Add your first student</Link></div>
        </div>
      </div>
    )
  }

  const rows = (data ?? []) as StudentRow[]
  return (
    <div>
      {head}
      <section className="dash-card" aria-label="Student list">
        <div className="dash-toolbar">
          <form method="get" action="/students" role="search">
            <input className="dash-input" type="search" name="q" defaultValue={f.q} placeholder="Search name or email" aria-label="Search students" maxLength={60} />
            <select className="dash-select" name="level" defaultValue={f.level} aria-label="Level">
              {LEVELS.map(l => <option key={l} value={l}>{l === 'all' ? 'All levels' : l}</option>)}
            </select>
            <select className="dash-select" name="status" defaultValue={f.status} aria-label="Status">
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select className="dash-select" name="sort" defaultValue={f.sort} aria-label="Sort by">
              {SORTS.map(s => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
            </select>
            <button type="submit" className="dash-btn is-primary">Apply</button>
          </form>
          <div className="dash-toolbar-right">
            {filtered && <Link href="/students" className="dash-btn is-ghost">Clear filters</Link>}
            <a className="dash-btn" href={exportHref} data-testid="export-csv"><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</a>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="dash-state" data-testid="students-nomatch">
            <h2>{f.page > 1 ? 'That page is empty' : 'No students match'}</h2>
            <p>{f.page > 1 ? 'There are fewer students than that.' : 'Try a different word, or clear the filters.'}</p>
            <div className="dash-state-actions"><Link href={f.page > 1 ? href({ page: 1 }) : '/students'} className="dash-btn">{f.page > 1 ? 'Go to page 1' : 'Clear filters'}</Link></div>
          </div>
        ) : <StudentsTable rows={rows} />}
        <ListPager total={count ?? 0} page={f.page} hrefFor={p => href({ page: p })} noun="students" />
      </section>
    </div>
  )
}
