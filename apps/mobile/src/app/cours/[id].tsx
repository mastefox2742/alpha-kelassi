import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import Pdf from 'react-native-pdf'
import { supabase } from '../../lib/supabase'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'
import { database, DocumentModel } from '../../db'
import { Q } from '@nozbe/watermelondb'

interface Doc { id: string; title: string; type: string; level: string; year: number | null; session: string | null; is_premium: boolean; pdf_url: string }

export default function CoursDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { isOnline } = useNetworkStatus()
  const [doc, setDoc] = useState<Doc | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [localPath, setLocalPath] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPremiumBlocked, setIsPremiumBlocked] = useState(false)

  useEffect(() => {
    loadDoc()
  }, [id])

  async function loadDoc() {
    // Check local DB first
    const localDocs = await database.get<DocumentModel>('documents').query(Q.where('remote_id', id)).fetch()
    if (localDocs[0]?.localPdfPath) {
      setLocalPath(localDocs[0].localPdfPath)
    }

    if (!isOnline) {
      if (localDocs[0]) {
        setDoc({ id: localDocs[0].remoteId, title: localDocs[0].title, type: localDocs[0].type, level: localDocs[0].level, year: localDocs[0].year, session: localDocs[0].session, is_premium: localDocs[0].isPremium, pdf_url: '' })
      }
      setLoading(false)
      return
    }

    const { data } = await supabase.from('documents').select('*').eq('id', id).single()
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

  async function downloadForOffline() {
    if (!signedUrl || !doc) return
    setDownloading(true)
    try {
      const path = `${FileSystem.documentDirectory}kelassi_${doc.id}.pdf`
      await FileSystem.downloadAsync(signedUrl, path)
      setLocalPath(path)

      // Update WatermelonDB
      await database.write(async () => {
        const existing = await database.get<DocumentModel>('documents').query(Q.where('remote_id', doc.id)).fetch()
        if (existing[0]) {
          await existing[0].update((m) => {
            m.localPdfPath = path
            m.downloadedAt = Date.now()
          })
        } else {
          await database.get<DocumentModel>('documents').create((m) => {
            m.remoteId = doc.id
            m.title = doc.title
            m.type = doc.type
            m.level = doc.level
            m.year = doc.year
            m.isPremium = doc.is_premium
            m.localPdfPath = path
            m.downloadedAt = Date.now()
          })
        }
      })
      Alert.alert('Téléchargé ✓', 'Le document est disponible hors-ligne.')
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger le document.')
    }
    setDownloading(false)
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#2563eb" />

  if (isPremiumBlocked) {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedIcon}>⭐</Text>
        <Text style={styles.blockedTitle}>Contenu Premium</Text>
        <Text style={styles.blockedSub}>Ce document est réservé aux abonnés Premium.</Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/(tabs)/profil')}>
          <Text style={styles.upgradeBtnText}>Passer à Premium</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const pdfSource = localPath
    ? { uri: `file://${localPath}`, cache: true }
    : signedUrl
      ? { uri: signedUrl, cache: false }
      : null

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.docHeader}>
        <Text style={styles.docTitle} numberOfLines={2}>{doc?.title}</Text>
        <View style={styles.docMeta}>
          <Text style={styles.levelBadge}>{doc?.level.replace('_', ' ').toUpperCase()}</Text>
          {doc?.year && <Text style={styles.metaText}>· {doc.year}</Text>}
        </View>
        <View style={styles.actions}>
          {!localPath ? (
            <TouchableOpacity
              style={[styles.downloadBtn, (!signedUrl || downloading) && styles.downloadBtnDisabled]}
              onPress={downloadForOffline}
              disabled={!signedUrl || downloading}
            >
              {downloading ? <ActivityIndicator size="small" color="#2563eb" /> : <Text style={styles.downloadBtnText}>⬇️ Télécharger hors-ligne</Text>}
            </TouchableOpacity>
          ) : (
            <View style={styles.downloadedBadge}>
              <Text style={styles.downloadedText}>✓ Disponible hors-ligne</Text>
            </View>
          )}
        </View>
      </View>

      {/* PDF Viewer */}
      {pdfSource ? (
        <Pdf
          source={pdfSource}
          style={styles.pdf}
          onError={(err) => Alert.alert('Erreur PDF', String(err))}
          trustAllCerts={false}
        />
      ) : (
        <View style={styles.noPdf}>
          <Text style={styles.noPdfText}>
            {isOnline ? 'PDF indisponible' : 'Ce document n\'a pas été téléchargé hors-ligne.'}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  docHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  docTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  levelBadge: { fontSize: 11, backgroundColor: '#eff6ff', color: '#2563eb', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontWeight: '600' },
  metaText: { fontSize: 13, color: '#6b7280' },
  actions: { flexDirection: 'row' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#eff6ff', gap: 6 },
  downloadBtnDisabled: { opacity: 0.5 },
  downloadBtnText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  downloadedBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#f0fdf4' },
  downloadedText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  pdf: { flex: 1 },
  noPdf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPdfText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  blockedIcon: { fontSize: 56, marginBottom: 16 },
  blockedTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  blockedSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  upgradeBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
