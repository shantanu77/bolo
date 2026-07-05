'use client'
import { useEffect, useRef, useState } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'How do I sound less nervous on client calls?',
  'How can I structure my answers better in meetings?',
  'I say "basically" too much — how do I stop?',
  'What should I focus on to improve my confidence score?',
  'Give me a tip for speaking to senior leadership.',
]

export default function CoachChat() {
  const [open, setOpen]         = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [unread, setUnread]     = useState(0)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    else if (messages.at(-1)?.role === 'assistant') setUnread(n => n + 1)
  }, [messages, open])

  async function send(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: newMessages }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e) {
      console.error('[chat]', e)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([])
  }

  const windowW = expanded ? 'w-[600px]' : 'w-[360px]'
  const windowH = expanded ? 'max-h-[80vh]'  : 'max-h-[560px]'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-300 flex items-center justify-center transition text-2xl"
        aria-label="Open AuraXpress Coach"
      >
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className={`fixed bottom-24 right-6 z-50 ${windowW} ${windowH} flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-200`}>

          {/* Header */}
          <div className="bg-indigo-600 px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-indigo-400 flex items-center justify-center text-lg shrink-0">🎤</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm">AuraXpress Coach</div>
              <div className="text-indigo-200 text-xs">Your personal communication coach</div>
            </div>
            <div className="flex items-center gap-1">
              {/* New chat */}
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="New conversation"
                  className="w-8 h-8 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 flex items-center justify-center transition text-base"
                >
                  ✏️
                </button>
              )}
              {/* Expand / collapse */}
              <button
                onClick={() => setExpanded(e => !e)}
                title={expanded ? 'Collapse' : 'Expand'}
                className="w-8 h-8 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 flex items-center justify-center transition text-sm"
              >
                {expanded ? '⊡' : '⊞'}
              </button>
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="w-8 h-8 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div>
                <div className="bg-indigo-50 rounded-2xl rounded-tl-sm px-4 py-3 mb-4">
                  <p className="font-medium text-indigo-700 text-sm mb-1">Hi! I am your AuraXpress Coach 👋</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Ask me anything about communicating better at work — tips, roleplay, weak area advice, or what to practise next.
                  </p>
                </div>
                <p className="text-xs text-gray-400 mb-2 font-medium px-1">Quick questions</p>
                <div className="space-y-1.5">
                  {STARTERS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="w-full text-left text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2.5 rounded-xl transition border border-indigo-100">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-sm shrink-0 mr-2 mt-0.5">🎤</div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-sm shrink-0">🎤</div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2 shrink-0 bg-white">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask your coach anything…"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700 placeholder-gray-400"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition text-base"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
