'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

interface VocabWord { word: string; definition?: string; def?: string }

export function VocabQuiz({ vocab, lessonLabel, backUrl }: {
  vocab: VocabWord[]; lessonLabel: string; backUrl: string
}) {
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [incorrect, setIncorrect] = useState(0)
  const [done, setDone] = useState(false)
  const [mode, setMode] = useState<'flashcard' | 'result'>('flashcard')

  const word = vocab[current]
  const total = vocab.length
  const definition = word?.definition ?? word?.def ?? ''

  function answer(isCorrect: boolean) {
    if (isCorrect) setCorrect(c => c + 1); else setIncorrect(i => i + 1)
    if (current + 1 >= total) { setMode('result'); setDone(true) }
    else { setCurrent(c => c + 1); setFlipped(false) }
  }

  function reset() {
    setCurrent(0); setFlipped(false); setCorrect(0); setIncorrect(0); setDone(false); setMode('flashcard')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={backUrl} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-[16px] font-bold text-gray-900">Vocabulary Quiz</h1>
          <p className="text-[12px] text-gray-400">{lessonLabel} · {total} words</p>
        </div>
      </div>

      {mode === 'flashcard' && (
        <>
          <div className="flex justify-between items-center text-[12px] text-gray-400">
            <span>{current + 1} / {total}</span>
            <span className="flex gap-3">
              <span className="text-emerald-500">{correct} correct</span>
              <span className="text-red-400">{incorrect} incorrect</span>
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-8 min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer select-none"
            onClick={() => setFlipped(f => !f)}>
            {!flipped ? (
              <>
                <p className="text-[22px] font-bold text-gray-900 mb-2">{word.word}</p>
                <p className="text-[12px] text-gray-400">Tap to reveal definition</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-indigo-600 mb-2">{word.word}</p>
                <p className="text-[16px] text-gray-700 leading-relaxed">{definition}</p>
              </>
            )}
          </div>
          {flipped && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => answer(false)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors font-semibold text-[14px]">
                <XCircle className="h-4 w-4" /> Didn&apos;t know
              </button>
              <button onClick={() => answer(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors font-semibold text-[14px]">
                <CheckCircle className="h-4 w-4" /> Got it!
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'result' && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center space-y-4">
          <div className="text-[48px]">{correct === total ? '🎉' : correct > total / 2 ? '👍' : '📚'}</div>
          <h2 className="text-[20px] font-bold text-gray-900">{correct}/{total} correct</h2>
          <p className="text-[14px] text-gray-500">{correct === total ? 'Perfect score!' : `Keep practicing — you'll get there!`}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-[14px] font-semibold hover:bg-indigo-700 transition-colors">
              <RotateCcw className="h-4 w-4" /> Try Again
            </button>
            <Link href={backUrl} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-[14px] font-semibold hover:bg-gray-50 transition-colors">
              Back to Lesson
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
