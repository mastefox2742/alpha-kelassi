import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { DatabaseProvider } from '@nozbe/watermelondb/react'
import { database } from '../db'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

function AuthGuard({ session }: { session: Session | null }) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) {
      router.replace('/(auth)/login')
    } else if (session && inAuth) {
      router.replace('/(tabs)/')
    }
  }, [session, segments])

  return null
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return null

  return (
    <DatabaseProvider database={database}>
      <AuthGuard session={session} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cours/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="examens/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="flashcards/index" options={{ headerShown: true, title: 'Flashcards' }} />
      </Stack>
      <StatusBar style="auto" />
    </DatabaseProvider>
  )
}
