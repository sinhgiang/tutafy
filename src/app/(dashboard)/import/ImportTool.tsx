'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, Users, BookOpen, ArrowRight } from 'lucide-react'

type Preview = {
  platform: string
  totalStudents: number
  totalLessons: number
  preview: { name: string; email: string; lessons: { date: string }[] }[]
}

type Result = {
  platform: string
  importedStudents: number
  importedLessons: number
  errors: string[]
}

export function ImportTool() {
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const text = await file.text()
    setCsvText(text)
    setFileName(file.name)
    setLoading(true)

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText: text, dryRun: true }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      alert(data.error || 'Failed to parse CSV')
      return
    }

    setPreview(data)
    setStep('preview')
  }

  async function runImport() {
    if (!csvText) return
    setLoading(true)
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText, dryRun: false }),
    })
    const data = await res.json()
    setLoading(false)
    setResult(data)
    setStep('done')
  }

  const PLATFORMS: Record<string, { color: string; label: string }> = {
    preply: { color: 'bg-blue-100 text-blue-700', label: 'Preply' },
    italki: { color: 'bg-orange-100 text-orange-700', label: 'iTalki' },
    generic: { color: 'bg-gray-100 text-gray-600', label: 'Generic CSV' },
  }

  return (
    <div className="max-w-[600px] space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-[12px]">
        {['Upload', 'Preview', 'Done'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-gray-200" />}
            <span className={`px-2.5 py-1 rounded-full font-semibold ${
              (i === 0 && step === 'upload') || (i === 1 && step === 'preview') || (i === 2 && step === 'done')
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}>{s}</span>
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <>
          {/* Format guide */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Supported Formats</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Preply', hint: 'Export from Sessions > Download', color: 'bg-blue-50 border-blue-100' },
                { name: 'iTalki', hint: 'Export from Lesson History', color: 'bg-orange-50 border-orange-100' },
                { name: 'Generic CSV', hint: 'Any CSV with student names + lesson dates', color: 'bg-gray-50 border-gray-100' },
              ].map(p => (
                <div key={p.name} className={`rounded-lg border p-3 ${p.color}`}>
                  <p className="text-[12px] font-semibold text-gray-900">{p.name}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{p.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            className="bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all p-12 text-center cursor-pointer"
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                <p className="text-[13px] text-gray-500">Parsing CSV...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Upload className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">Drop CSV file here</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">or click to browse</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {step === 'preview' && preview && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <p className="text-[13px] font-semibold text-gray-900">{fileName}</p>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${PLATFORMS[preview.platform]?.color}`}>
                {PLATFORMS[preview.platform]?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  <p className="text-[11px] font-semibold text-indigo-600 uppercase">Students</p>
                </div>
                <p className="text-[24px] font-bold text-indigo-700">{preview.totalStudents}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                  <p className="text-[11px] font-semibold text-purple-600 uppercase">Lessons</p>
                </div>
                <p className="text-[24px] font-bold text-purple-700">{preview.totalLessons}</p>
              </div>
            </div>

            {preview.preview.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Preview (first 5 students)</p>
                <div className="space-y-2">
                  {preview.preview.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-indigo-600">{s.name[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                        {s.email && <p className="text-[11px] text-gray-400 truncate">{s.email}</p>}
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{s.lessons.length} lessons</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('upload'); setPreview(null); setCsvText('') }}
              className="flex-1 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 py-2.5 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={runImport}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 py-2.5 rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? 'Importing...' : `Import ${preview.totalStudents} students`}
            </button>
          </div>
        </>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-5 ${result.errors.length === 0 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center gap-3 mb-3">
              {result.errors.length === 0
                ? <CheckCircle className="h-5 w-5 text-green-500" />
                : <AlertCircle className="h-5 w-5 text-amber-500" />
              }
              <p className="text-[14px] font-bold text-gray-900">
                {result.errors.length === 0 ? 'Import Complete!' : 'Import finished with warnings'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-gray-500">Students created</p>
                <p className="text-[20px] font-bold text-gray-900">{result.importedStudents}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Lessons imported</p>
                <p className="text-[20px] font-bold text-gray-900">{result.importedLessons}</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 p-4">
              <p className="text-[12px] font-semibold text-red-600 mb-2">Errors ({result.errors.length})</p>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-[11px] text-red-500">{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep('upload'); setPreview(null); setResult(null); setCsvText('') }}
              className="flex-1 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 py-2.5 rounded-lg transition-colors"
            >
              Import Another File
            </button>
            <a
              href="/students"
              className="flex-1 text-center text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 py-2.5 rounded-lg transition-colors"
            >
              View Students →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
