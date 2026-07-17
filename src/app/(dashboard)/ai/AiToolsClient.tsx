'use client'

import { useState } from 'react'
import { Sparkles, BookOpen, FileText, MessageSquare, Wand2, Send, Loader2, TrendingUp, LayoutList, CheckSquare } from 'lucide-react'

const TOOLS = [
  {
    id: 'lesson-plan',
    icon: BookOpen,
    title: 'Lesson Plan Generator',
    description: 'Structured lesson plan for any topic and level',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    prompt: 'Create a detailed lesson plan for:',
    placeholder: 'e.g. Past tense for B1 level student, 60 minutes',
  },
  {
    id: 'homework',
    icon: FileText,
    title: 'Homework Creator',
    description: 'Personalized homework exercises for your student',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    prompt: 'Create homework exercises for:',
    placeholder: 'e.g. Pronunciation practice for Vietnamese speaker, A2 level',
  },
  {
    id: 'progress-report',
    icon: TrendingUp,
    title: 'Progress Report',
    description: 'Monthly progress report to send parents or students',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    prompt: 'Write a professional monthly progress report for:',
    placeholder: 'e.g. Maria, 8 weeks, B1→B2, improved speaking 40%, needs grammar work, goals: IELTS 7.0',
  },
  {
    id: 'flashcards',
    icon: LayoutList,
    title: 'Flashcard Generator',
    description: 'Turn vocabulary into study-ready flashcards',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    prompt: 'Create flashcards for these vocabulary words:',
    placeholder: 'e.g. ambiguous, eloquent, perseverance, meticulous, obsolete',
  },
  {
    id: 'feedback',
    icon: MessageSquare,
    title: 'Student Feedback Writer',
    description: 'Professional feedback for parents or students',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    prompt: 'Write student progress feedback for:',
    placeholder: 'e.g. Maria, 8 weeks, B1→B2, improved speaking but needs grammar work',
  },
  {
    id: 'correction',
    icon: Wand2,
    title: 'Essay Corrector',
    description: 'Correct student writing with detailed explanations',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    prompt: 'Correct this student essay with explanations:',
    placeholder: 'Paste the student\'s essay here...',
    multiline: true,
  },
  {
    id: 'bio',
    icon: CheckSquare,
    title: 'Tutor Bio Writer',
    description: 'Write your professional profile to attract students',
    color: 'text-teal-500',
    bg: 'bg-teal-50',
    prompt: 'Write a professional tutor bio for:',
    placeholder: 'e.g. 5 years teaching English, specialise in IELTS and business English, native speaker, taught 200+ students from Vietnam and Japan',
  },
]

export function AiToolsClient() {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const tool = TOOLS.find(t => t.id === activeTool)

  async function generate() {
    if (!tool || !input.trim()) return
    setLoading(true)
    setOutput('')

    const systemPrompt = tool.id === 'flashcards'
      ? 'You are a language teacher. Create flashcards in this exact format for each word: WORD: [word] | MEANING: [clear definition] | EXAMPLE: [example sentence]. One flashcard per line. No extra text.'
      : tool.id === 'progress-report'
      ? 'You are an experienced language tutor writing a professional monthly progress report. Be specific, encouraging, and data-driven. Include: overview, skills assessment (speaking/listening/reading/writing), key achievements, areas for improvement, next month goals. Plain text, no markdown symbols.'
      : 'You are an expert language tutor assistant. Provide clear, practical, professional responses. Use plain text formatting only — no markdown symbols like **, ##, or bullet dashes. Write in clean paragraphs.'

    const fullPrompt = `${tool.prompt}\n\n${input}\n\nProvide a detailed, professional response suitable for a language tutor.`

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, system: systemPrompt }),
      })
      const data = await res.json()
      if (data.error === 'GROQ_API_KEY not configured') {
        setOutput('AI not configured yet. Please add your GROQ_API_KEY to Vercel environment variables.')
      } else {
        setOutput(data.text ?? 'No response generated.')
      }
    } catch {
      setOutput('Error connecting to AI. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          AI Tools
        </h1>
        <p className="text-[13px] text-gray-400 mt-0.5">7 AI-powered tools — save hours every week</p>
      </div>

      {/* Tool selector */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 md:grid-cols-2">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTool(t.id); setInput(''); setOutput('') }}
            className={`text-left p-4 rounded-xl border transition-all ${
              activeTool === t.id
                ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center mb-3`}>
              <t.icon className={`h-[18px] w-[18px] ${t.color}`} />
            </div>
            <p className="text-[13px] font-semibold text-gray-900">{t.title}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>

      {/* Input / output */}
      {tool && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-[13px] font-semibold text-gray-900">{tool.title}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{tool.prompt}</p>
          </div>
          <div className="p-5 space-y-4">
            {tool.multiline ? (
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={tool.placeholder}
                rows={5}
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
              />
            ) : (
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={tool.placeholder}
                onKeyDown={e => e.key === 'Enter' && generate()}
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              />
            )}
            <button
              onClick={generate}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-colors px-4 py-2 rounded-lg"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? 'Generating...' : 'Generate'}
            </button>

            {output && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Result</p>
                <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{output}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(output)}
                  className="mt-3 text-[11px] text-indigo-500 hover:underline font-medium"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeTool && (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-6 text-center">
          <Sparkles className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-indigo-900">7 tools — choose one above to get started</p>
          <p className="text-[12px] text-indigo-600 mt-1">Lesson plans, progress reports, flashcards, essay correction, and more — all in seconds.</p>
        </div>
      )}
    </div>
  )
}
