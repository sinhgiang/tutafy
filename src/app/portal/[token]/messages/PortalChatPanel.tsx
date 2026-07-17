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

export function PortalChatPanel({
  token,
  tutorName,
  studentName,
  initialMessages,
}: {
  token: string
  tutorName: string
  studentName: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const prevLenRef = useRef<number>(initialMessages.length)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Lazily get / resume the shared AudioContext (browsers create it "suspended"
  // when not made during a user gesture).
  function getAudioCtx(): AudioContext | null {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext
        if (!AC) return null
        audioCtxRef.current = new AC()
      }
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
      return audioCtxRef.current
    } catch { return null }
  }

  // Short two-tone "ting" — same sound the tutor hears, synthesized (no asset).
  function playDing() {
    try {
      const ctx = getAudioCtx()
      if (!ctx || ctx.state !== 'running') return
      const now = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = 'sine'
      o.frequency.setValueAtTime(880, now)
      o.frequency.setValueAtTime(1320, now + 0.11)
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
      o.start(now)
      o.stop(now + 0.36)
    } catch { /* audio unavailable */ }
  }

  // Unlock audio on the first interaction so later dings (from the poll timer) work
  useEffect(() => {
    function unlock() {
      const ctx = getAudioCtx()
      if (ctx && ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock)
        window.removeEventListener('keydown', unlock)
      }
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Poll for new messages every 4s; play the "ting" when a new message from the
  // tutor arrives (not on first load, and never for the student's own messages).
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/portal/${token}/messages`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const msgs: Message[] = data.messages ?? []
        if (msgs.length > prevLenRef.current) {
          const added = msgs.slice(prevLenRef.current)
          if (added.some(m => m.sender_type === 'tutor')) playDing()
        }
        prevLenRef.current = msgs.length
        setMessages(msgs)
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [token])

  async function send() {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_type: 'student',
      content: text,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages(prev => [...prev, optimistic])

    const res = await fetch(`/api/portal/${token}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[13px] text-gray-400">No messages yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Send a message to {tutorName}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_type === 'student'
          const prevMsg = messages[i - 1]
          const nextMsg = messages[i + 1]
          const showTime = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000
          // Name only under the LAST message of a same-sender run (Facebook/Zalo style)
          const isLastOfGroup = !nextMsg || nextMsg.sender_type !== msg.sender_type

          return (
            <div key={msg.id}>
              {showTime && (
                <p className="text-[10px] text-gray-300 text-center my-2">
                  {formatTime(msg.created_at)}
                </p>
              )}
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-indigo-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                {isLastOfGroup && (
                  <p className={`text-[10px] text-gray-400 mt-1 ${isMe ? 'pr-1' : 'pl-1'}`}>
                    {isMe ? 'You' : tutorName}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-3 flex items-end gap-2 flex-shrink-0">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Message ${tutorName}...`}
          rows={1}
          className="flex-1 resize-none text-[13px] px-3 py-2.5 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors max-h-[120px] overflow-y-auto"
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
