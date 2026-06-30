'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { auth, db } from '@/lib/firebase/client'
import { getIdToken } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { MarkdownRenderer } from '@/components/markdown-renderer'

interface ImageAttachment {
  data:     string
  mimeType: string
  preview:  string
}

interface Message {
  id:         string
  role:       'user' | 'assistant'
  content:    string
  streaming?: boolean
  image?:     string
  isSolution?: boolean
}

interface Session {
  id:         string
  created_at: string
  documents:  { title: string } | null
}

// ── Modal confirmation Solution Directe (free users) ─────────────────────────
function SolutionConfirmModal({
  creditsLeft,
  onConfirm,
  onCancel,
}: {
  creditsLeft: number
  onConfirm: () => void
  onCancel:  () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">⚡</div>
          <h3 className="text-lg font-black text-gray-900">Solution complète</h3>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Cette action utilisera <strong className="text-amber-600">tous tes {creditsLeft} crédit{creditsLeft > 1 ? 's' : ''} restant{creditsLeft > 1 ? 's' : ''}</strong> du jour.
            Tu ne pourras plus poser de questions avant demain.
          </p>
        </div>
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 mb-5 text-sm text-amber-700">
          💡 <strong>Conseil :</strong> Passe à <strong>Premium</strong> pour des solutions illimitées à <strong>2 000 FCFA/mois</strong>.
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 bg-amber-500 text-white rounded-2xl text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm">
            Utiliser mes crédits
          </button>
        </div>
        <Link href="/billing"
          className="block text-center text-xs text-blue-600 hover:underline mt-4">
          Passer Premium — accès illimité →
        </Link>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  { icon: '🔬', text: 'Explique-moi la photosynthèse' },
  { icon: '📐', text: 'Comment résoudre une équation du 2nd degré ?' },
  { icon: '📈', text: "Qu'est-ce que la dérivée ?" },
  { icon: '🌍', text: 'Résume le chapitre sur la colonisation' },
]

/* ── Compression image (max 1024px, JPEG 80%) ─────────────────────────── */
async function compressImage(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1024
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else                { width  = Math.round(width  * MAX / height); height = MAX }
      }
      const canvas  = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const preview = canvas.toDataURL('image/jpeg', 0.8)
      URL.revokeObjectURL(url)
      resolve({ data: preview.split(',')[1], mimeType: 'image/jpeg', preview })
    }
    img.onerror = reject
    img.src = url
  })
}

/** Retourne le Firebase ID Token du user courant, ou null */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  try { return await getIdToken(user) } catch { return null }
}

export default function TuteurPage() {
  const [messages,        setMessages]        = useState<Message[]>([])
  const [sessions,        setSessions]        = useState<Session[]>([])
  const [sessionId,       setSessionId]       = useState<string | null>(null)
  const [input,           setInput]           = useState('')
  const [selectedImage,   setSelectedImage]   = useState<ImageAttachment | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [quotaRemaining,  setQuotaRemaining]  = useState<number | null>(null)
  const [sourcesCount,    setSourcesCount]    = useState(0)
  const [exerciseContext, setExerciseContext]  = useState<string | null>(null)
  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [userPlan,        setUserPlan]        = useState<'free' | 'premium'>('free')
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const docId  = params.get('document')
    const q      = params.get('q')
    const exId   = params.get('exercise')
    if (q) { setInput(decodeURIComponent(q)); if (exId) setExerciseContext(exId) }
    else if (docId) setInput('Explique-moi ce document.')
  }, [])

  // Charge le plan utilisateur via Firebase
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          setUserPlan((snap.data()?.plan as 'free' | 'premium') ?? 'free')
        }
      } catch {}
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadSessions() {
    const token = await getAuthToken()
    const res   = await fetch('/api/ai/sessions', token ? { headers: { Authorization: `Bearer ${token}` } } : {})
    if (!res.ok) return
    const json = await res.json() as { data?: typeof sessions }
    setSessions(json.data ?? [])
  }

  async function loadSessionMessages(sid: string) {
    const token = await getAuthToken()
    const res   = await fetch(`/api/ai/sessions/${sid}/messages`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
    if (!res.ok) return
    const json = await res.json() as { data?: { id: string; role: 'user' | 'assistant'; content: string }[] }
    setMessages((json.data ?? []).map((m) => ({ ...m })))
    setSessionId(sid)
    setSidebarOpen(false)
  }

  async function clearHistory() {
    if (!confirm('Effacer tout l\'historique des conversations ?')) return
    setClearingHistory(true)
    const token = await getAuthToken()
    await fetch('/api/ai/sessions', { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} })
    setSessions([])
    setMessages([])
    setSessionId(null)
    setClearingHistory(false)
  }

  /* ── Sélection + compression de l'image ──────────────────────────────── */
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Image trop lourde (max 10 Mo)')
      return
    }
    try {
      const compressed = await compressImage(file)
      setSelectedImage(compressed)
    } catch {
      alert('Impossible de lire cette image.')
    }
    e.target.value = ''
  }

  /* ── Envoi du message ─────────────────────────────────────────────────── */
  const sendMessage = useCallback(async (revealSolution = false) => {
    const hasText  = input.trim().length > 0
    const hasImage = !!selectedImage
    if ((!hasText && !hasImage) || loading) return

    const question    = hasText ? input.trim() : '📷 Aide-moi avec cet exercice.'
    const imageToSend = selectedImage
    setInput('')
    setSelectedImage(null)
    setExerciseContext(null)
    setShowSolutionModal(false)
    setLoading(true)

    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    'user',
      content: revealSolution ? `⚡ Solution complète demandée : ${question}` : question,
      image:   imageToSend?.preview,
    }
    const assistantMsg: Message = {
      id:         crypto.randomUUID(),
      role:       'assistant',
      content:    '',
      streaming:  true,
      isSolution: revealSolution,
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    try {
      const params     = new URLSearchParams(window.location.search)
      const documentId = params.get('document')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatBody: Record<string, any> = { question, revealSolution }
      if (sessionId)   chatBody.session_id  = sessionId
      if (documentId)  chatBody.document_id = documentId
      if (imageToSend) chatBody.image = { data: imageToSend.data, mimeType: imageToSend.mimeType }

      const token = await getAuthToken()
      const res   = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(chatBody),
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

      const newSessionId  = res.headers.get('X-Session-Id')
      const remaining     = res.headers.get('X-Quota-Remaining')
      if (newSessionId && !sessionId) setSessionId(newSessionId)
      if (remaining) setQuotaRemaining(parseInt(remaining, 10))

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer     = ''
      let hasContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim() || line.startsWith('event:')) continue
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.error) {
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: `❌ ${payload.error}`, streaming: false }
                    : m
                ))
                return
              }
              if (typeof payload.text === 'string' && payload.text.length > 0) {
                hasContent = true
                setMessages((prev) => prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + payload.text }
                    : m
                ))
              }
              if (payload.sources_count !== undefined) setSourcesCount(payload.sources_count)
            } catch { /* ligne non-JSON */ }
          }
        }
      }

      if (!hasContent) {
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: '❌ Kelassi n\'a pas pu répondre. Réessaie dans quelques secondes.', streaming: false }
            : m
        ))
        return
      }

      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsg.id ? { ...m, streaming: false } : m
      ))
      loadSessions()
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsg.id
          ? { ...m, content: '❌ Erreur de connexion. Réessaie.', streaming: false }
          : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, selectedImage, loading, sessionId])

  function newSession() {
    setMessages([])
    setSessionId(null)
    setSourcesCount(0)
    setSelectedImage(null)
    setSidebarOpen(false)
  }

  const canSend     = (input.trim().length > 0 || !!selectedImage) && !loading
  const hasMessages = messages.length > 0

  function handleSolutionClick() {
    if (!canSend) return
    if (userPlan === 'premium') {
      sendMessage(true)
    } else {
      if ((quotaRemaining ?? 0) <= 0) return
      setShowSolutionModal(true)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Modal confirmation Solution Directe (plan free) */}
      {showSolutionModal && (
        <SolutionConfirmModal
          creditsLeft={quotaRemaining ?? 1}
          onConfirm={() => sendMessage(true)}
          onCancel={() => setShowSolutionModal(false)}
        />
      )}

      {/* ── Sidebar desktop ───────────────────────────────────────────── */}
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
          <div className="flex items-center justify-between px-2 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historique</p>
            {sessions.length > 0 && (
              <button onClick={clearHistory} disabled={clearingHistory}
                className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40">
                {clearingHistory ? '…' : '🗑 Effacer'}
              </button>
            )}
          </div>
          {sessions.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">Aucune conversation</p>}
          {sessions.map((s) => (
            <button key={s.id} onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                s.id === sessionId ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <p className="truncate">{s.documents?.title ?? 'Session libre'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Sidebar mobile ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col h-full shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <p className="font-semibold text-sm">Conversations</p>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-3 border-b">
              <button onClick={newSession} className="w-full py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
                ✏️ Nouvelle conversation
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">Aucune conversation</p>}
              {sessions.map((s) => (
                <button key={s.id} onClick={() => loadSessionMessages(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    s.id === sessionId ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <p className="truncate">{s.documents?.title ?? 'Session libre'}</p>
                  <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                </button>
              ))}
            </div>
            {sessions.length > 0 && (
              <div className="p-3 border-t">
                <button onClick={clearHistory} disabled={clearingHistory}
                  className="w-full py-2 text-xs text-red-500 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-40">
                  {clearingHistory ? 'Suppression…' : '🗑 Effacer l\'historique'}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ── Zone principale ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-gray-600 mr-1">☰</button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-black">K</div>
            <div>
              <p className="font-semibold text-sm text-gray-900">Kelassi IA</p>
              <p className="text-xs text-emerald-600 font-medium">● En ligne · Guide par questions</p>
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
                {quotaRemaining} restante{quotaRemaining !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── Messages ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white text-center mb-8">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🤖</div>
                <h2 className="text-2xl font-black mb-2">Bonjour ! Je suis Kelassi</h2>
                <p className="text-emerald-100 text-sm leading-relaxed max-w-sm mx-auto">
                  Ton tuteur IA pour le BEPC et le BAC. Pose tes questions ou envoie une photo de ton exercice — je te guide pour trouver la réponse toi-même !
                </p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 text-xs font-medium">
                  📷 Nouveau : envoie une photo d'exercice
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-4">Questions populaires</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s) => (
                  <button key={s.text} onClick={() => setInput(s.text)}
                    className="flex items-center gap-3 text-left px-4 py-3.5 bg-white rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm transition-all group">
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
                  <div className="max-w-[80%] flex flex-col items-end gap-2">
                    {msg.image && (
                      <div className="rounded-2xl rounded-br-sm overflow-hidden border-2 border-emerald-500 shadow-md max-w-xs">
                        <Image src={msg.image} alt="Exercice envoyé" width={300} height={300}
                          className="object-contain max-h-64 w-auto" unoptimized />
                      </div>
                    )}
                    {msg.content && msg.content !== '📷 Aide-moi avec cet exercice.' && (
                      <div className="px-4 py-3 rounded-2xl rounded-br-sm text-sm whitespace-pre-wrap leading-relaxed bg-emerald-600 text-white shadow-md">
                        {msg.content}
                      </div>
                    )}
                    {msg.content === '📷 Aide-moi avec cet exercice.' && !msg.image && (
                      <div className="px-4 py-3 rounded-2xl rounded-br-sm text-sm bg-emerald-600 text-white shadow-md">
                        {msg.content}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-gray-800 shadow-sm ${
                    msg.isSolution
                      ? 'bg-amber-50 border border-amber-200'
                      : 'bg-white border border-gray-100'
                  }`}>
                    {msg.isSolution && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mb-2">
                        ⚡ Solution complète
                      </span>
                    )}
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

        {/* ── Zone de saisie ────────────────────────────────────────── */}
        <div className="bg-white border-t border-gray-100 px-4 py-4 flex-shrink-0">

          {exerciseContext && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700">
              <span>📋</span>
              <span className="flex-1">Contexte exercice chargé</span>
              <button onClick={() => setExerciseContext(null)} className="text-purple-400 hover:text-purple-700 font-bold">✕</button>
            </div>
          )}

          {selectedImage && (
            <div className="mb-3 flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="relative flex-shrink-0">
                <Image src={selectedImage.preview} alt="Aperçu" width={80} height={80}
                  className="w-20 h-20 object-cover rounded-lg border border-emerald-300" unoptimized />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 shadow"
                >✕</button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700">📷 Image prête à envoyer</p>
                <p className="text-xs text-emerald-600 mt-0.5">Ajoute une question ou envoie directement.</p>
              </div>
            </div>
          )}

          {quotaRemaining === 0 ? (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-amber-700 font-medium">Limite journalière atteinte.</p>
              <Link href="/billing" className="text-sm bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-600">
                Passer Premium ⭐
              </Link>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-2">
              {hasMessages && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSolutionClick}
                    disabled={!canSend || (quotaRemaining !== null && quotaRemaining <= 0)}
                    title={userPlan === 'premium' ? 'Solution complète (Premium)' : `Coûte tous tes crédits restants (${quotaRemaining ?? '?'})`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
                      bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300"
                  >
                    ⚡ Solution directe
                    {userPlan === 'premium'
                      ? <span className="text-amber-500 text-[10px]">Premium</span>
                      : <span className="text-amber-500 text-[10px]">{quotaRemaining ?? '?'} crédit{(quotaRemaining ?? 0) > 1 ? 's' : ''}</span>
                    }
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Envoyer une photo d'exercice"
                  className={`flex-shrink-0 w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-lg transition-all ${
                    selectedImage
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-600'
                      : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50'
                  } disabled:opacity-40`}
                >
                  📷
                </button>

                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    className="w-full resize-none border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 max-h-36 transition-all"
                    placeholder={selectedImage ? 'Pose une question sur cette image… (ou envoie directement)' : 'Pose ta question à Kelassi… (Entrée pour envoyer)'}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                    }}
                  />
                </div>

                <button
                  onClick={() => sendMessage()}
                  disabled={!canSend}
                  className="flex-shrink-0 px-5 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
                >
                  {loading ? '…' : '→'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
