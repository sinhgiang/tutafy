'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

type Message = {
  id: string
  sender_type: 'tutor' | 'student'
  content: string
  created_at: string
  read_at: string | null
}

export function ChatPanel({
  studentId,
  studentName,
  initialMessages,
}: {
  studentId: string
  studentName: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages every 8s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/messages?student_id=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [studentId])

  async function send() {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_type: 'tutor',
      content: text,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages(prev => [...prev, optimistic])

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, content: text }),
    })

    if (res.ok) {
      const { message } = await res.json()
      setMessages(prev => prev.map(m => m.id === optimistic.id ? message : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text)
    }
    setSending(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
              <Send className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-[13px] font-medium text-gray-500">No messages yet</p>
            <p className="text-[12px] text-gray-400 mt-1">
              Send a message to {studentName}
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_type === 'tutor'
          const prevMsg = messages[i - 1]
          const showTime = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000

          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-[10px] text-gray-300 text-center my-2">
                  {formatTime(msg.created_at)}
                </p>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-indigo-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 flex items-end gap-2 flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Message ${studentName}...`}
          rows={1}
          className="flex-1 resize-none text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors max-h-[120px] overflow-y-auto"
          style={{ lineHeight: '1.5' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-9 h-9 flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex-shrink-0"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  )
}
