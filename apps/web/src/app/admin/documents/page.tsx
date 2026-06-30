import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { AdminDocumentsClient } from './client'

export default async function AdminDocumentsPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const profileSnap = await adminDb.collection('users').doc(user.uid).get()
  if (profileSnap.data()?.role !== 'admin') redirect('/dashboard')

  const [subjectsSnap, documentsSnap] = await Promise.all([
    adminDb.collection('subjects').orderBy('level').orderBy('name').get(),
    adminDb.collection('documents').orderBy('created_at', 'desc').limit(200).get(),
  ])

  const subjects  = subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const documents = documentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return <AdminDocumentsClient subjects={subjects as any[]} documents={documents as any[]} />
}
