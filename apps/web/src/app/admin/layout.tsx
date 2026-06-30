import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { AdminSidebar } from './_components/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()
  if (!user) redirect('/login')

  let profileName = 'Admin'
  try {
    const snap = await adminDb.collection('users').doc(user.id).get()
    const d = snap.data()
    if (d?.role !== 'admin') redirect('/dashboard')
    profileName = d?.full_name ?? d?.email ?? 'Admin'
  } catch {
    redirect('/dashboard')
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
