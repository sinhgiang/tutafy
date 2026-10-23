'use client'

// Import (T-0824): three steps, Upload, Preview, Done. The preview is a TABLE of the first rows with what would happen to each
// student (lessons, first and last date, a note), and nothing is saved until the tutor presses Import.
import { useRef, useState } from 'react'
import { CheckCircle, CircleAlert, Download, FileText, Loader2, Upload } from 'lucide-react'
import { PageColumn } from '@/components/layout/PageFrame'
import { problemsCsv, type ImportProblem, type PreviewRow } from '@/lib/csv-import'

type Preview = { platform: string; totalStudents: number; totalLessons: number; rowsInFile: number; shown: number; rows: PreviewRow[]; problems?: ImportProblem[]; problemsTotal?: number }
type Result = { platform: string; importedStudents: number; importedLessons: number; errors: string[]; problems?: ImportProblem[]; problemsTotal?: number }

const PLATFORM_LABEL: Record<string, string> = { preply: 'Preply', italki: 'iTalki', generic: 'Generic CSV' }
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-')

/** Saves the problems as a CSV file (built here from what the server sent; nothing is uploaded). */
function downloadProblems(problems: ImportProblem[]) {
  const url = URL.createObjectURL(new Blob([problemsCsv(problems)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'import-problems.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** The rows that cannot be imported: how many, the first few with the reason, and the file with all of them. */
function ProblemsCard({ problems, total, title }: { problems: ImportProblem[]; total: number; title: string }) {
  if (total === 0) return null
  return (
    <div className="dash-card dash-card-b" data-testid="import-problems">
      <b style={{ color: 'var(--d-err)' }}>{title} ({total})</b>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--d-ink-2)' }}>
        {problems.slice(0, 5).map((p, i) => <li key={i}>{p.row > 0 ? `Row ${p.row}` : 'Student'}{p.student ? `, ${p.student}` : ''}: {p.problem}. {p.result}.</li>)}
      </ul>
      {total > 5 && <p style={{ margin: '6px 0 0', color: 'var(--d-ink-3)' }}>and {total - 5} more in the file.</p>}
      <button type="button" className="dash-btn" style={{ marginTop: 12 }} onClick={() => downloadProblems(problems)}>
        <Download className="h-4 w-4" aria-hidden="true" /> Download the problems as a CSV file
      </button>
    </div>
  )
}

export function ImportTool() {
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState('')
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setProblem('')
    const text = await file.text()
    setLoading(true)
    try {
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText: text, dryRun: true }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setProblem(data.error || 'We could not read that file. Check that it is a CSV with a header row.'); return }
      setCsvText(text); setFileName(file.name); setPreview(data); setStep('preview')
    } finally { setLoading(false) }
  }

  async function runImport() {
    if (!csvText) return
    setLoading(true)
    try {
      const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csvText, dryRun: false }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setProblem(data.error || 'The import failed. Nothing was saved twice: you can try again.'); return }
      setResult(data); setStep('done')
    } finally { setLoading(false) }
  }

  function reset() { setStep('upload'); setPreview(null); setResult(null); setCsvText(''); setProblem('') }

  return (
    <PageColumn size="form" className="space-y-5">
      <ol className="flex items-center gap-2" aria-label="Steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {['Upload', 'Preview', 'Done'].map((s, i) => {
          const on = (i === 0 && step === 'upload') || (i === 1 && step === 'preview') || (i === 2 && step === 'done')
          return <li key={s} aria-current={on ? 'step' : undefined} className={`dash-chip ${on ? 'is-brand-chip' : ''}`}>{i + 1}. {s}</li>
        })}
      </ol>

      {problem && <div className="dash-card dash-card-b" role="alert" data-testid="import-problem" style={{ color: 'var(--d-err)', background: 'var(--d-err-soft)' }}>{problem}</div>}

      {step === 'upload' && (
        <>
          <div className="dash-card dash-card-b">
            <b style={{ color: 'var(--d-ink)' }}>Files we can read</b>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--d-ink-3)' }}>
              <li><b>Preply:</b> export from Sessions, then Download.</li>
              <li><b>iTalki:</b> export from Lesson History.</li>
              <li><b>Any CSV</b> with student names and lesson dates, and a header row.</li>
            </ul>
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFile(f) }}
            className="dash-card" style={{ width: '100%', padding: 48, border: '2px dashed var(--d-line-strong)', background: 'var(--d-surface)', cursor: 'pointer', textAlign: 'center', color: 'var(--d-ink)', whiteSpace: 'normal' }}>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Choose a CSV file" onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }} />
            {loading ? <Loader2 className="h-8 w-8 animate-spin" style={{ margin: '0 auto', color: 'var(--d-brand)' }} aria-label="Reading the file" />
              : <><Upload className="h-7 w-7" aria-hidden="true" style={{ margin: '0 auto 8px', color: 'var(--d-brand)' }} /><b style={{ display: 'block' }}>Drop a CSV file here</b><span style={{ color: 'var(--d-ink-3)' }}>or press to choose one. Nothing is saved yet.</span></>}
          </button>
        </>
      )}

      {step === 'preview' && preview && (
        <>
          <div className="dash-card dash-card-b" data-testid="import-preview">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <FileText className="h-4 w-4" aria-hidden="true" style={{ color: 'var(--d-ink-3)' }} />
              <b style={{ color: 'var(--d-ink)' }}>{fileName}</b>
              <span className="dash-chip is-brand-chip">{PLATFORM_LABEL[preview.platform] ?? 'Generic CSV'}</span>
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--d-ink-2)' }}>
              This file holds <b>{preview.totalStudents}</b> student{preview.totalStudents === 1 ? '' : 's'} and <b>{preview.totalLessons}</b> lesson{preview.totalLessons === 1 ? '' : 's'} (from {preview.rowsInFile} rows). Nothing is saved until you press Import.
            </p>
          </div>
          <ProblemsCard problems={preview.problems ?? []} total={preview.problemsTotal ?? 0} title="Rows that cannot be imported" />
          <div className="dash-card">
            <div className="dash-table-wrap overflow-x-auto">
              <table className="dash-table" aria-label="What will be imported">
                <thead><tr><th>Student</th><th className="is-num">Lessons</th><th>First</th><th>Last</th><th>Note</th></tr></thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i}>
                      <td><b style={{ fontWeight: 650 }}>{r.name}</b><div style={{ color: 'var(--d-ink-3)', fontSize: 13 }}>{r.email || 'no email'}</div></td>
                      <td className="is-num">{r.lessons}</td>
                      <td>{day(r.firstLesson)}</td>
                      <td>{day(r.lastLesson)}</td>
                      <td style={{ color: r.notes.length ? 'var(--d-warn)' : 'var(--d-ink-3)', fontSize: 13 }}>{r.notes.length ? r.notes.join('. ') : 'New student'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.totalStudents > preview.shown && <p className="dash-card-b" style={{ color: 'var(--d-ink-3)', paddingTop: 12 }}>Showing the first {preview.shown} of {preview.totalStudents} students. All of them are imported.</p>}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="dash-btn" style={{ flex: 1 }} onClick={reset}>Back</button>
            <button type="button" className="dash-btn is-primary" style={{ flex: 1 }} onClick={runImport} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {loading ? 'Importing' : `Import ${preview.totalStudents} student${preview.totalStudents === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="dash-card dash-card-b" data-testid="import-done" style={{ background: (result.problemsTotal ?? result.errors.length) === 0 ? 'var(--d-ok-soft)' : 'var(--d-warn-soft)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {(result.problemsTotal ?? result.errors.length) === 0 ? <CheckCircle className="h-5 w-5" aria-hidden="true" style={{ color: 'var(--d-ok)' }} /> : <CircleAlert className="h-5 w-5" aria-hidden="true" style={{ color: 'var(--d-warn)' }} />}
              <b style={{ color: 'var(--d-ink)' }}>{(result.problemsTotal ?? result.errors.length) === 0 ? 'Import complete' : 'Import finished with warnings'}</b>
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--d-ink-2)' }}>{result.importedStudents} student{result.importedStudents === 1 ? '' : 's'} created, {result.importedLessons} lesson{result.importedLessons === 1 ? '' : 's'} imported.</p>
          </div>
          <ProblemsCard problems={result.problems ?? []} total={result.problemsTotal ?? result.errors.length} title="Problems" />
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="dash-btn" style={{ flex: 1 }} onClick={reset}>Import another file</button>
            <a href="/students" className="dash-btn is-primary" style={{ flex: 1 }}>View students</a>
          </div>
        </div>
      )}
    </PageColumn>
  )
}
