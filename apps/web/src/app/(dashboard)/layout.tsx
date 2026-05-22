import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BetaFeedbackButton } from '@/components/beta-feedback-button'
import { NotificationBanner } from '@/components/notification-banner'

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
    .select('full_name, plan, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex">
      {/* Skip to content — accessibilité clavier */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Aller au contenu principal
      </a>

      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-white px-4 py-6" aria-label="Navigation principale">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2" aria-label="Kelassi — Accueil">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center" aria-hidden="true">
            <span className="text-white font-black text-xs">K</span>
          </div>
          <span className="text-xl font-black text-gray-900">Kelassi</span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5" aria-label="Menu principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          {profile?.role === 'admin' && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
              </div>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span>🛠️</span> Console admin
              </Link>
            </>
          )}
        </nav>

        {/* Footer sidebar */}
        <div className="border-t pt-4 space-y-3">
          {/* User info */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">
                {(profile?.full_name ?? user.email ?? 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {profile?.full_name ?? user.email}
              </p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-0.5 ${
                profile?.plan === 'premium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {profile?.plan === 'premium' ? '⭐ Premium' : 'Gratuit'}
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-3 px-2 text-xs text-gray-400">
            <Link href="/cgu" className="hover:text-gray-600 transition-colors">CGU</Link>
            <Link href="/confidentialite" className="hover:text-gray-600 transition-colors">Confidentialité</Link>
            <Link href="/compte/supprimer" className="hover:text-red-500 transition-colors">Supprimer</Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-auto bg-gray-50 pb-20 md:pb-0">
        <NotificationBanner plan={profile?.plan ?? 'free'} />
        {children}
      </main>

      <BetaFeedbackButton />

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-2 py-2 flex items-center justify-around" aria-label="Navigation mobile">
        {[
          { href: '/dashboard',  icon: '🏠', label: 'Accueil'  },
          { href: '/cours',      icon: '📚', label: 'Cours'    },
          { href: '/tuteur',     icon: '🤖', label: 'IA'       },
          { href: '/flashcards', icon: '🃏', label: 'Cartes'   },
          { href: '/progression',icon: '📈', label: 'Progrès'  },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
