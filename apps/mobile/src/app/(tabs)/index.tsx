import { useEffect, useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface RecentDoc { id: string; title: string; type: string; level: string }
interface Progress { id: string; subjects: { name: string } | null; score_avg: number; streak_days: number }

export default function HomeScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [plan, setPlan] = useState<string>('free')
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: profile }, { data: docs }, { data: prog }] = await Promise.all([
        supabase.from('users').select('full_name, plan').eq('id', user.id).single(),
        supabase.from('documents').select('id, title, type, level').eq('is_premium', false).order('created_at', { ascending: false }).limit(4),
        supabase.from('user_progress').select('*, subjects(name)').eq('user_id', user.id).limit(3),
      ])
      setName(profile?.full_name?.split(' ')[0] ?? 'Élève')
      setPlan(profile?.plan ?? 'free')
      setRecentDocs(docs ?? [])
      setProgress((prog ?? []) as Progress[])
      setLoading(false)
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2563eb" />

  const shortcuts = [
    { label: 'Cours', icon: '📚', color: '#eff6ff', route: '/(tabs)/cours' },
    { label: 'Examens', icon: '📝', color: '#f5f3ff', route: '/(tabs)/examens' },
    { label: 'Kelassi IA', icon: '🤖', color: '#f0fdf4', route: '/(tabs)/tuteur' },
    { label: 'Profil', icon: '👤', color: '#fffbeb', route: '/(tabs)/profil' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting}, {name} 👋</Text>
        <Text style={styles.subGreeting}>Prêt à réviser aujourd'hui ?</Text>
      </View>

      {/* Raccourcis */}
      <View style={styles.shortcuts}>
        {shortcuts.map((s) => (
          <TouchableOpacity
            key={s.label}
            style={[styles.shortcut, { backgroundColor: s.color }]}
            onPress={() => router.push(s.route as any)}
          >
            <Text style={styles.shortcutIcon}>{s.icon}</Text>
            <Text style={styles.shortcutLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progression */}
      {progress.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ma progression</Text>
          {progress.map((p) => (
            <View key={p.id} style={styles.progressRow}>
              <Text style={styles.progressSubject}>{p.subjects?.name}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(p.score_avg * 100, 100)}%` }]} />
              </View>
              <Text style={styles.streak}>{p.streak_days}🔥</Text>
            </View>
          ))}
        </View>
      )}

      {/* Cours récents */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Cours récents</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/cours')}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {recentDocs.map((doc) => (
          <TouchableOpacity
            key={doc.id}
            style={styles.docRow}
            onPress={() => router.push(`/cours/${doc.id}` as any)}
          >
            <Text style={styles.docIcon}>{doc.type === 'examen' ? '📝' : '📖'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
              <Text style={styles.docLevel}>{doc.level.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Banner premium */}
      {plan === 'free' && (
        <TouchableOpacity style={styles.premiumBanner} onPress={() => router.push('/(tabs)/profil')}>
          <Text style={styles.premiumTitle}>Passe à Premium ⭐</Text>
          <Text style={styles.premiumSub}>IA illimitée · Tous les examens · Hors-ligne</Text>
          <View style={styles.premiumButton}>
            <Text style={styles.premiumButtonText}>2 000 FCFA/mois</Text>
          </View>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingTop: 60 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subGreeting: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  shortcut: { width: '47%', borderRadius: 14, padding: 16, alignItems: 'center' },
  shortcutIcon: { fontSize: 28, marginBottom: 6 },
  shortcutLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12 },
  seeAll: { fontSize: 12, color: '#2563eb' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressSubject: { fontSize: 13, color: '#374151', width: 100 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 3 },
  streak: { fontSize: 12, color: '#6b7280', width: 30, textAlign: 'right' },
  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  docIcon: { fontSize: 22, marginRight: 12 },
  docTitle: { fontSize: 13, fontWeight: '500', color: '#111827' },
  docLevel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  premiumBanner: { borderRadius: 16, padding: 20, backgroundColor: '#2563eb', marginBottom: 16 },
  premiumTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  premiumSub: { fontSize: 13, color: '#bfdbfe', marginTop: 4, marginBottom: 12 },
  premiumButton: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  premiumButtonText: { color: '#1d4ed8', fontWeight: '700', fontSize: 14 },
})
