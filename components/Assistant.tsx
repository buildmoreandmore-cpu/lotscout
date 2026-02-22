'use client'
import { useState, useRef, useEffect } from 'react'

interface LotCard {
  id: string
  address: string
  zip: string
  county: string
  score: number
  acres: number
  assessed: number
  zoning: string
  owner: string
  absentee: boolean
  taxStatus: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  lots?: LotCard[]
}

export default function Assistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'I\'m your LotScout AI. I can help you analyze lots, find opportunities, and crunch deal numbers. Try asking:\n\n• "Show me the top lots"\n• "Best absentee-owned lots in 30310"\n• "MR-2 zoned lots under $10K"\n• "What are the cheapest lots?"' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response', lots: data.lots }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to assistant.' }])
    }
    setLoading(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
        title="LotScout AI Assistant"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-white">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7Z" />
          <path d="M9 22h6" />
          <path d="M10 22v-2" />
          <path d="M14 22v-2" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[95vw] max-w-[420px] h-[70vh] max-h-[600px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-white">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">LotScout AI</p>
            <p className="text-[10px] text-slate-500">Powered by MiniMax</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200 p-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] ${msg.role === 'user' ? '' : 'w-full'}`}>
              <div className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {msg.content}
              </div>
              {msg.lots && msg.lots.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.lots.slice(0, 10).map(lot => (
                    <a
                      key={lot.id}
                      href={`/lots?id=${lot.id}`}
                      className="block bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-200 truncate">{lot.address}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          lot.score >= 75 ? 'bg-green-500/20 text-green-400' :
                          lot.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{lot.score}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span>{lot.zip}</span>
                        <span>•</span>
                        <span>{lot.acres}ac</span>
                        <span>•</span>
                        <span>{lot.zoning}</span>
                        <span>•</span>
                        <span>${lot.assessed?.toLocaleString()}</span>
                        {lot.absentee && <span className="text-orange-400 font-medium">• ABSENTEE</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lot.owner}</p>
                    </a>
                  ))}
                  {msg.lots.length > 10 && (
                    <p className="text-[10px] text-slate-500 text-center pt-1">
                      +{msg.lots.length - 10} more lots
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-400">
              <span className="animate-pulse">Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-700 bg-slate-800/30">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about lots, deals, areas..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-2 text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
