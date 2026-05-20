import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { supabase } from '../../lib/supabase'

interface Message { id: string; role: 'user' | 'assistant'; content: string; streaming?: boolean }

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export default function TuteurScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null)
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setLoading(true)

    const userMsgId = Math.random().toString(36)
    const asstMsgId = Math.random().toString(36)
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: question },
      { id: asstMsgId, role: 'assistant', content: '', streaming: true },
    ])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question, session_id: sessionId }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => prev.map((m) =>
          m.id === asstMsgId ? { ...m, content: `❌ ${err.error?.message ?? 'Erreur'}`, streaming: false } : m
        ))
        setLoading(false)
        return
      }

      const newSessionId = res.headers.get('X-Session-Id')
      const remaining = res.headers.get('X-Quota-Remaining')
      if (newSessionId && !sessionId) setSessionId(newSessionId)
      if (remaining) setQuotaRemaining(parseInt(remaining, 10))

      // Streaming SSE via fetch reader
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
          if (line.startsWith('data: ') && !line.includes('"{}"}')) {
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.text) {
                setMessages((prev) => prev.map((m) =>
                  m.id === asstMsgId ? { ...m, content: m.content + payload.text } : m
                ))
              }
            } catch {}
          }
        }
      }

      setMessages((prev) => prev.map((m) =>
        m.id === asstMsgId ? { ...m, streaming: false } : m
      ))
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === asstMsgId ? { ...m, content: '❌ Erreur réseau. Vérifie ta connexion.', streaming: false } : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId])

  const SUGGESTIONS = [
    'Explique la photosynthèse',
    'Résous $x^2 - 5x + 6 = 0$',
    'La démocratie au Congo',
  ]

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>🤖</Text></View>
        <View>
          <Text style={styles.headerTitle}>Kelassi IA</Text>
          <Text style={styles.headerSub}>Tuteur · Méthode Feynman</Text>
        </View>
        {quotaRemaining !== null && (
          <View style={[styles.quotaBadge, quotaRemaining <= 2 && styles.quotaBadgeLow]}>
            <Text style={[styles.quotaText, quotaRemaining <= 2 && styles.quotaTextLow]}>
              {quotaRemaining} restante{quotaRemaining > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyTitle}>Bonjour ! Je suis Kelassi</Text>
            <Text style={styles.emptySub}>Pose-moi n'importe quelle question sur tes cours.</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestion} onPress={() => setInput(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.role === 'user' && styles.msgRowUser]}>
            {item.role === 'assistant' && (
              <View style={styles.msgAvatar}><Text style={{ fontSize: 12, color: '#fff' }}>K</Text></View>
            )}
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
              <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                {item.content}
                {item.streaming && <Text style={styles.cursor}> ▊</Text>}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Pose ta question..."
          placeholderTextColor="#9ca3af"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendBtnText}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6b7280' },
  quotaBadge: { marginLeft: 'auto', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  quotaBadgeLow: { backgroundColor: '#fef2f2' },
  quotaText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  quotaTextLow: { color: '#ef4444' },
  messageList: { flex: 1 },
  messageContent: { padding: 16, gap: 12, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20, paddingHorizontal: 24 },
  suggestions: { gap: 8, width: '100%' },
  suggestion: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  suggestionText: { fontSize: 13, color: '#374151' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: '#16a34a', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  cursor: { color: '#86efac' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 12 },
  input: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
