'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export default function TuteurPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null)
  const [sourcesCount, setSourcesCount] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Pré-remplit la question si on vient d'une page cours/examen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const docId = params.get('document')
    if (docId) setInput(`Explique-moi ce document.`)
  }, [])

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadSessions() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`${API_URL}/api/ai/sessions`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json()
    setSessions(json.data ?? [])
  }

  async function loadSessionMessages(sid: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(`${API_URL}/api/ai/sessions/${sid}/messages`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json()
    setMessages((json.data ?? []).map((m: any) => ({ ...m, id: m.id })))
    setSessionId(sid)
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setLoading(true)

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question }
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams(window.location.search)
      const documentId = params.get('document')

      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question, session_id: sessionId, document_id: documentId }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `❌ ${err.error?.message ?? 'Erreur'}`, streaming: false }
            : m
        ))
        setLoading(false)
        return
      }

      // Lis les headers
      const newSessionId = res.headers.get('X-Session-Id')
      const remaining = res.headers.get('X-Quota-Remaining')
      if (newSessionId && !sessionId) setSessionId(newSessionId)
      if (remaining) setQuotaRemaining(parseInt(remaining, 10))

      // Streaming SSE
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
          if (line.startsWith('event: meta')) continue
          if (line.startsWith('event: done')) continue
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.text) {
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + payload.text }
                    : m
                ))
              }
              if (payload.sources_count !== undefined) setSourcesCount(payload.sources_count)
            } catch {}
          }
        }
      }

      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsg.id ? { ...m, streaming: false } : m
      ))
      loadSessions()
    } catch (err) {
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsg.id
          ? { ...m, content: '❌ Erreur de connexion. Réessaie.', streaming: false }
          : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId])

  function newSession() {
    setMessages([])
    setSessionId(null)
    setSourcesCount(0)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar sessions */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-white">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">Conversations</h2>
          <button
            onClick={newSession}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700"
          >
            + Nouveau
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 ${s.id === sessionId ? 'bg-green-50 text-green-700' : 'text-gray-600'}`}
            >
              <p className="truncate">{s.documents?.title ?? 'Session libre'}</p>
              <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-4">Aucune conversation</p>
          )}
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
            <div>
              <h1 className="font-semibold text-sm">Kelassi IA</h1>
              <p className="text-xs text-gray-400">Tuteur pédagogique · Méthode Feynman</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sourcesCount > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                📚 {sourcesCount} source{sourcesCount > 1 ? 's' : ''} RAG
              </span>
            )}
            {quotaRemaining !== null && (
              <span className={`text-xs px-2 py-1 rounded-full ${quotaRemaining <= 2 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                {quotaRemaining} question{quotaRemaining > 1 ? 's' : ''} restante{quotaRemaining > 1 ? 's' : ''}
              </span>
            )}
            <button onClick={newSession} className="text-xs text-gray-400 hover:text-gray-600">Effacer</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="max-w-xl mx-auto text-center py-12">
              <div className="text-5xl mb-4">🤖</div>
              <h2 className="text-lg font-semibold mb-2">Bonjour ! Je suis Kelassi</h2>
              <p className="text-gray-500 text-sm mb-6">Ton tuteur IA pour le BEPC et le BAC. Pose-moi n'importe quelle question sur tes cours.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Explique-moi la photosynthèse',
                  'Comment résoudre une équation du 2nd degré ?',
                  'Qu\'est-ce que la dérivée ?',
                  'Résume le chapitre sur la colonisation',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-sm text-left px-3 py-2 rounded-xl border bg-white hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs mr-2 mt-1 flex-shrink-0">K</div>
              )}
              <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : 'bg-white border rounded-bl-sm text-gray-800'
              }`}>
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 bg-green-400 ml-1 animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t px-4 py-3">
          {quotaRemaining === 0 ? (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-700">Limite journalière atteinte.</p>
              <Link href="/billing" className="text-sm bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600">
                Passer Premium
              </Link>
            </div>
          ) : (
            <div className="flex items-end gap-2 max-w-4xl mx-auto">
              <textarea
                className="flex-1 resize-none border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 max-h-32"
                placeholder="Pose ta question à Kelassi..."
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex-shrink-0"
              >
                {loading ? '...' : 'Envoyer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
