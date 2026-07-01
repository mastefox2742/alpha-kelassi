import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { AdminSidebar } from './_components/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()
  if (!user) redirect('/login')

  // Vérification via custom claim Firebase (pas de Firestore requis)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(user as any).admin) redirect('/dashboard')

  let profileName = user.name ?? user.email ?? 'Admin'

  // Tente d'enrichir le nom via Firestore (optionnel)
  try {
    const snap = await adminDb.collection('users').doc(user.id).get()
    if (snap.exists) profileName = snap.data()?.full_name ?? profileName
  } catch {
    // Firestore indisponible — le custom claim suffit
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar name={profileName} />
      <main className="flex-1 ml-64 min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  )
}
