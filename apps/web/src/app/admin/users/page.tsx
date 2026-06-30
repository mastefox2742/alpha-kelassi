import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { AdminUsersClient } from './client'

export default async function AdminUsersPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const profileSnap = await adminDb.collection('users').doc(user.uid).get()
  if (profileSnap.data()?.role !== 'admin') redirect('/dashboard')

  const snap = await adminDb
    .collection('users')
    .orderBy('created_at', 'desc')
    .limit(200)
    .get()

  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return <AdminUsersClient users={users as any[]} />
}
