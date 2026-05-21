import { useEffect, useState, memo, useCallback } from 'react'
import { FlatList, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { database, DocumentModel } from '../../db'
import { Q } from '@nozbe/watermelondb'

interface Doc { id: string; title: string; type: string; level: string; year: number | null; is_premium: boolean }

const CourseCard = memo(({ item, onPress }: { item: Doc; onPress: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.cardLeft}>
      <Text style={styles.cardIcon}>{item.type === 'examen' ? '📝' : '📖'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardLevel}>{item.level.replace('_', ' ').toUpperCase()}{item.year ? ` · ${item.year}` : ''}</Text>
      </View>
    </View>
    {item.is_premium && <Text style={styles.premium}>⭐</Text>}
  </TouchableOpacity>
))

const LEVELS = ['', 'bepc', 'bac_a', 'bac_c', 'bac_d'] as const
const LEVEL_LABELS: Record<string, string> = { '': 'Tous', bepc: 'BEPC', bac_a: 'BAC A', bac_c: 'BAC C', bac_d: 'BAC D' }

export default function CoursScreen() {
  const router = useRouter()
  const { isOnline } = useNetworkStatus()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')

  useEffect(() => {
    loadDocs()
  }, [isOnline])

  async function loadDocs() {
    if (isOnline) {
      const { data } = await supabase
        .from('documents')
        .select('id, title, type, level, year, is_premium')
        .eq('type', 'cours')
        .order('created_at', { ascending: false })
        .limit(100)

      const fetchedDocs = (data ?? []) as Doc[]
      setDocs(fetchedDocs)

      // Sync to WatermelonDB for offline access
      await database.write(async () => {
        for (const doc of fetchedDocs) {
          const existing = await database.get<DocumentModel>('documents').query(Q.where('remote_id', doc.id)).fetch()
          if (existing.length === 0) {
            await database.get<DocumentModel>('documents').create((m) => {
              m.remoteId = doc.id
              m.title = doc.title
              m.type = doc.type
              m.level = doc.level
              m.year = doc.year
              m.isPremium = doc.is_premium
            })
          }
        }
      })
    } else {
      // Load from local DB
      const localDocs = await database.get<DocumentModel>('documents').query(Q.where('type', 'cours')).fetch()
      setDocs(localDocs.map((m) => ({ id: m.remoteId, title: m.title, type: m.type, level: m.level, year: m.year, is_premium: m.isPremium })))
    }
    setLoading(false)
  }

  const filtered = docs.filter((d) => {
    if (level && d.level !== level) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const ITEM_HEIGHT = 82 // hauteur carte + gap
  const getItemLayout = useCallback((_: unknown, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), [])

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2563eb" />

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cours & Révisions</Text>
        <TextInput
          style={styles.search}
          placeholder="Rechercher un cours..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
        <View style={styles.levels}>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.levelChip, level === l && styles.levelChipActive]}
              onPress={() => setLevel(l)}
            >
              <Text style={[styles.levelChipText, level === l && styles.levelChipTextActive]}>
                {LEVEL_LABELS[l]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {!isOnline && (
          <Text style={styles.offlineNote}>📡 Hors-ligne — affichage des cours téléchargés</Text>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        getItemLayout={getItemLayout}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item }) => (
          <CourseCard item={item} onPress={() => router.push(`/cours/${item.id}` as any)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Aucun cours trouvé</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  search: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 10 },
  levels: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  levelChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  levelChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  levelChipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  levelChipTextActive: { color: '#fff' },
  offlineNote: { fontSize: 12, color: '#d97706', marginTop: 8 },
  list: { padding: 16, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#f3f4f6' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: { fontSize: 24, marginRight: 12 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  cardLevel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  premium: { fontSize: 16, marginLeft: 8 },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
})
