import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Pdf from 'react-native-pdf'
import { supabase } from '../../lib/supabase'

interface Doc { id: string; title: string; level: string; year: number | null; session: string | null; is_premium: boolean; pdf_url: string; subjects: { name: string } | null }

export default function ExamenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPremiumBlocked, setIsPremiumBlocked] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('documents').select('*, subjects(name)').eq('id', id).eq('type', 'examen').single()
      if (!data) { setLoading(false); return }
      setDoc(data as Doc)

      if (data.is_premium) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('users').select('plan').eq('id', user.id).single()
          if (profile?.plan !== 'premium') {
            setIsPremiumBlocked(true)
            setLoading(false)
            return
          }
        }
      }

      const bucket = data.is_premium ? 'pdfs-premium' : 'pdfs-public'
      const fileName = data.pdf_url.split('/').pop() ?? ''
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(fileName, 900)
      setSignedUrl(signed?.signedUrl ?? null)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#7c3aed" />

  if (isPremiumBlocked) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedIcon}>⭐</Text>
        <Text style={styles.blockedTitle}>Contenu Premium</Text>
        <Text style={styles.blockedSub}>Cet examen est réservé aux abonnés Premium.</Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/(tabs)/profil')}>
          <Text style={styles.upgradeBtnText}>Passer à Premium</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.docHeader}>
        <Text style={styles.docTitle} numberOfLines={2}>{doc?.title}</Text>
        <View style={styles.docMeta}>
          <Text style={styles.levelBadge}>{doc?.level.replace('_', ' ').toUpperCase()}</Text>
          {doc?.year && <Text style={styles.metaText}>· {doc.year}</Text>}
          {doc?.session && (
            <Text style={[styles.sessionBadge, doc.session === 'rattrapage' && styles.rattrapageBadge]}>
              {doc.session}
            </Text>
          )}
        </View>
        {doc?.subjects?.name && <Text style={styles.subject}>{doc.subjects.name}</Text>}
      </View>

      {signedUrl ? (
        <Pdf
          source={{ uri: signedUrl, cache: false }}
          style={styles.pdf}
          onError={(err) => Alert.alert('Erreur PDF', String(err))}
          trustAllCerts={false}
        />
      ) : (
        <View style={styles.noPdf}>
          <Text style={styles.noPdfText}>PDF indisponible</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  docHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  docTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  levelBadge: { fontSize: 11, backgroundColor: '#f3e8ff', color: '#7c3aed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontWeight: '600' },
  metaText: { fontSize: 13, color: '#6b7280' },
  sessionBadge: { fontSize: 11, backgroundColor: '#dcfce7', color: '#16a34a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  rattrapageBadge: { backgroundColor: '#ffedd5', color: '#ea580c' },
  subject: { fontSize: 12, color: '#9ca3af' },
  pdf: { flex: 1 },
  noPdf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPdfText: { fontSize: 14, color: '#9ca3af' },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  blockedIcon: { fontSize: 56, marginBottom: 16 },
  blockedTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  blockedSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  upgradeBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
