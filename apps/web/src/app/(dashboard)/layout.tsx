import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { href: '/dashboard', label: 'Accueil', icon: '🏠' },
  { href: '/cours', label: 'Cours', icon: '📚' },
  { href: '/examens', label: 'Examens', icon: '📝' },
  { href: '/tuteur', label: 'Kelassi IA', icon: '🤖' },
  { href: '/flashcards', label: 'Flashcards', icon: '🃏' },
  { href: '/progression', label: 'Progression', icon: '📈' },
  { href: '/billing', label: 'Premium', icon: '⭐' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, plan, role, xp')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-white px-4 py-6">
        <Link href="/dashboard" className="text-xl font-extrabold text-blue-600 mb-8 px-2">
          Kelassi
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {profile?.role === 'admin' && (
            <>
              <Link
                href="/admin/documents"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                <span>🛠️</span> Admin — Docs
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                <span>📊</span> Analytics
              </Link>
            </>
          )}
        </nav>
        <div className="border-t pt-4 px-2 space-y-1">
          <p className="text-xs font-medium text-gray-900 truncate">{profile?.full_name ?? user.email}</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              profile?.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {profile?.plan === 'premium' ? '⭐ Premium' : 'Gratuit'}
            </span>
            {(profile?.xp ?? 0) > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                {profile?.xp} XP
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
