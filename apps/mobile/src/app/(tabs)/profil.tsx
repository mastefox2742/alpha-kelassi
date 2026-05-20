import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface Profile { full_name: string | null; plan: string }

export default function ProfilScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const { data } = await supabase.from('users').select('full_name, plan').eq('id', user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  async function signOut() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/(auth)/login')
        }
      },
    ])
  }

  if (!profile) return <ActivityIndicator style={{ flex: 1 }} color="#2563eb" />

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.full_name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{profile.full_name ?? 'Élève'}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={[styles.planBadge, profile.plan === 'premium' && styles.planBadgePremium]}>
          <Text style={[styles.planText, profile.plan === 'premium' && styles.planTextPremium]}>
            {profile.plan === 'premium' ? '⭐ Premium' : 'Gratuit'}
          </Text>
        </View>
      </View>

      {profile.plan === 'free' && (
        <TouchableOpacity style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Passer à Premium — 2 000 FCFA/mois</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 24 },
  header: { alignItems: 'center', paddingTop: 60, marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 8 },
  planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: '#f3f4f6' },
  planBadgePremium: { backgroundColor: '#fef3c7' },
  planText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  planTextPremium: { color: '#d97706' },
  upgradeBtn: { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12 },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  logoutBtn: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
})
