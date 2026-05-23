'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { MarkdownRenderer } from '@/components/markdown-renderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface Session {
  id: string
  created_at: string
  documents: { title: string } | null
}


const SUGGESTIONS = [
  { icon: '🔬', text: 'Explique-moi la photosynthèse' },
  { icon: '📐', text: 'Comment résoudre une équation du 2nd degré ?' },
  { icon: '📈', text: "Qu'est-ce que la dérivée ?" },
  { icon: '🌍', text: 'Résume le chapitre sur la colonisation' },
]

export default function TuteurPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null)
  const [sourcesCount, setSourcesCount] = useState(0)
  const [exerciseContext, setExerciseContext] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const docId = params.get('document')
    const q = params.get('q')
    const exerciseId = params.get('exercise')
    if (q) { setInput(decodeURIComponent(q)); if (exerciseId) setExerciseContext(exerciseId) }
    else if (docId) setInput('Explique-moi ce document.')
  }, [])

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadSessions() {
    const res = await fetch('/api/ai/sessions')
    if (!res.ok) return
    const json = await res.json() as { data?: typeof sessions }
    setSessions(json.data ?? [])
  }

  async function loadSessionMessages(sid: string) {
    const res = await fetch(`/api/ai/sessions/${sid}/messages`)
    if (!res.ok) return
    const json = await res.json() as { data?: { id: string; role: 'user' | 'assistant'; content: string }[] }
    setMessages((json.data ?? []).map((m) => ({ ...m })))
    setSessionId(sid)
    setSidebarOpen(false)
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setExerciseContext(null)
    setLoading(true)

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question }
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    try {
      const params = new URLSearchParams(window.location.search)
      const documentId = params.get('document')

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id: sessionId, document_id: documentId }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, content: `❌ ${err.error?.message ?? 'Erreur'}`, streaming: false } : m
        ))
        setLoading(false)
        return
      }

      const newSessionId = res.headers.get('X-Session-Id')
      const remaining = res.headers.get('X-Quota-Remaining')
      if (newSessionId && !sessionId) setSessionId(newSessionId)
      if (remaining) setQuotaRemaining(parseInt(remaining, 10))

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('event: meta') || line.startsWith('event: done')) continue
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.text) {
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, content: m.content + payload.text } : m
                ))
              }
              if (payload.sources_count !== undefined) setSourcesCount(payload.sources_count)
            } catch {}
          }
        }
      }

      setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, streaming: false } : m))
      loadSessions()
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsg.id ? { ...m, content: '❌ Erreur de connexion. Réessaie.', streaming: false } : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId])

  function newSession() {
    setMessages([])
    setSessionId(null)
    setSourcesCount(0)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-72 flex-col bg-white border-r border-gray-100">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-black">K</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Kelassi IA</p>
              <p className="text-xs text-gray-400">Tuteur pédagogique</p>
            </div>
          </div>
          <button
            onClick={newSession}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            ✏️ Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-2">Historique</p>
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-3">Aucune conversation</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                s.id === sessionId
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <p className="truncate">{s.documents?.title ?? 'Session libre'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col h-full shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <p className="font-semibold text-sm">Conversations</p>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-3 border-b">
              <button onClick={newSession} className="w-full py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
                ✏️ Nouvelle conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.map((s) => (
                <button key={s.id} onClick={() => loadSessionMessages(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${s.id === sessionId ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <p className="truncate">{s.documents?.title ?? 'Session libre'}</p>
                  <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-gray-600 mr-1">
              ☰
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-black">K</div>
            <div>
              <p className="font-semibold text-sm text-gray-900">Kelassi IA</p>
              <p className="text-xs text-emerald-600 font-medium">● En ligne · Méthode Feynman</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sourcesCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                📚 {sourcesCount} source{sourcesCount > 1 ? 's' : ''}
              </span>
            )}
            {quotaRemaining !== null && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                quotaRemaining <= 2 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {quotaRemaining} restante{quotaRemaining > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto">
              {/* Welcome card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white text-center mb-8">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🤖</div>
                <h2 className="text-2xl font-black mb-2">Bonjour ! Je suis Kelassi</h2>
                <p className="text-emerald-100 text-sm leading-relaxed max-w-sm mx-auto">
                  Ton tuteur IA pour le BEPC et le BAC. J'explique avec la méthode Feynman — pose-moi n'importe quelle question sur tes cours.
                </p>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-4">Questions populaires</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => setInput(s.text)}
                    className="flex items-center gap-3 text-left px-4 py-3.5 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm transition-all group"
                  >
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <span className="text-sm text-gray-700 group-hover:text-emerald-700 font-medium leading-snug">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-1">K</div>
                )}
                {msg.role === 'user' ? (
                  /* Message utilisateur — texte brut, bulle verte */
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-sm text-sm whitespace-pre-wrap leading-relaxed bg-emerald-600 text-white shadow-md">
                    {msg.content}
                  </div>
                ) : (
                  /* Réponse Kelassi — Markdown + LaTeX rendu */
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-gray-100 text-gray-800 shadow-sm">
                    <MarkdownRenderer content={msg.content} prose={false} />
                    {msg.streaming && (
                      <span className="inline-flex gap-0.5 mt-1 align-middle">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0 mt-1">Moi</div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-4 py-4 flex-shrink-0">
          {exerciseContext && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700">
              <span>📋</span>
              <span className="flex-1">Contexte exercice chargé — Kelassi répondra avec précision sur cet exercice.</span>
              <button onClick={() => setExerciseContext(null)} className="text-purple-400 hover:text-purple-700 font-bold">✕</button>
            </div>
          )}
          {quotaRemaining === 0 ? (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-amber-700 font-medium">Limite journalière atteinte.</p>
              <Link href="/billing" className="text-sm bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-600 transition-colors">
                Passer Premium ⭐
              </Link>
            </div>
          ) : (
            <div className="flex items-end gap-3 max-w-3xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  className="w-full resize-none border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 max-h-36 transition-all"
                  placeholder="Pose ta question à Kelassi… (Entrée pour envoyer)"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-5 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm flex-shrink-0 transition-colors shadow-sm"
              >
                {loading ? '…' : '→'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
