import Link from 'next/link'

const FEATURES = [
  {
    icon: '📚',
    title: 'Cours résumés',
    desc: 'Tous les cours BEPC & BAC par matière, rédigés en fiches claires et structurées.',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: '📝',
    title: 'Examens officiels',
    desc: 'Sujets d\'État 2010–2024 avec corrigés détaillés étape par étape.',
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
  },
  {
    icon: '🤖',
    title: 'Tuteur IA Kelassi',
    desc: 'Pose n\'importe quelle question. Kelassi explique avec la méthode Feynman 24h/24.',
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: '🃏',
    title: 'Flashcards SM-2',
    desc: 'Algorithme de répétition espacée. Mémorise sans effort, révise au bon moment.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
  },
  {
    icon: '📴',
    title: 'Mode hors-ligne',
    desc: 'Télécharge tes cours. Révise dans le bus, au marché — sans connexion.',
    color: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50',
  },
  {
    icon: '🏆',
    title: 'Progression gamifiée',
    desc: 'XP, niveaux, badges et streak quotidien. La révision devient un jeu.',
    color: 'from-cyan-500 to-sky-500',
    bg: 'bg-cyan-50',
  },
]

const LEVELS = [
  { label: 'BEPC', sub: '3ème', color: 'bg-blue-600' },
  { label: 'BAC C', sub: 'Maths-Sciences', color: 'bg-violet-600' },
  { label: 'BAC D', sub: 'Sciences Nat.', color: 'bg-emerald-600' },
  { label: 'BAC A', sub: 'Lettres', color: 'bg-amber-500' },
]

const STATS = [
  { value: '50+', label: 'Beta testeurs actifs' },
  { value: '12', label: 'Matières couvertes' },
  { value: '2010–2024', label: 'Années d\'examens' },
  { value: '24/7', label: 'Tuteur IA disponible' },
]

const TESTIMONIALS = [
  {
    quote: 'Kelassi m\'a aidé à comprendre les intégrales en 20 minutes. Le tuteur IA explique mieux que certains profs.',
    name: 'Étudiant BAC C',
    school: 'Lycée Savorgnan de Brazza · Brazzaville',
    avatar: 'K',
    color: 'bg-blue-600',
  },
  {
    quote: 'J\'adore les flashcards. Je révise dans le bus maintenant ! Mon niveau en SVT a vraiment progressé.',
    name: 'Élève BEPC',
    school: 'Lycée Victor Augagneur · Brazzaville',
    avatar: 'A',
    color: 'bg-violet-600',
  },
  {
    quote: 'Les corrigés détaillés des examens d\'État sont incroyables. Je comprends enfin la méthode à suivre.',
    name: 'Étudiant BAC D',
    school: 'Lycée Saint-Exupéry · Pointe-Noire',
    avatar: 'M',
    color: 'bg-emerald-600',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-xl font-black text-gray-900">Kelassi</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
            <a href="#niveaux" className="hover:text-gray-900 transition-colors">Niveaux</a>
            <a href="#temoignages" className="hover:text-gray-900 transition-colors">Témoignages</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Commencer gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge Congo */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold px-5 py-2 rounded-full mb-8">
            🇨🇬 Fait pour les élèves congolais
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-[1.05] tracking-tight">
            Réussis ton{' '}
            <span className="text-gradient">BEPC</span>
            {' '}et ton{' '}
            <span className="text-gradient">BAC</span>
            {' '}avec l'IA
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Cours résumés · Examens d'État officiels · Tuteur IA disponible 24h/24
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-200"
            >
              Commencer gratuitement
              <span>→</span>
            </Link>
            <Link
              href="/cours"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:border-gray-300 transition-all"
            >
              Voir les cours
            </Link>
          </div>

          {/* Niveaux */}
          <div id="niveaux" className="flex flex-wrap justify-center gap-3">
            {LEVELS.map((l) => (
              <div
                key={l.label}
                className={`${l.color} text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-md`}
              >
                <span className="font-black text-sm">{l.label}</span>
                <span className="text-white/70 text-xs font-medium">· {l.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-12 bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-white mb-1">{s.value}</p>
              <p className="text-sm text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Fonctionnalités</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Tout ce qu'il te faut pour réussir
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Une seule application pour préparer tes examens, de la révision à la correction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`${f.bg} rounded-3xl p-7 border border-white card-hover cursor-default`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-5 shadow-md`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Comment ça marche</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900">
              3 étapes pour réussir
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Crée ton compte', desc: 'Inscription gratuite en 30 secondes. Choisis ton niveau et tes matières.', icon: '✍️' },
              { step: '02', title: 'Révise & entraîne-toi', desc: 'Cours, examens corrigés, flashcards et questions au tuteur IA Kelassi.', icon: '📖' },
              { step: '03', title: 'Progresse chaque jour', desc: 'Suis ta progression, gagne des XP, maintiens ton streak de révision.', icon: '📈' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-blue-200">
                  {item.icon}
                </div>
                <span className="text-xs font-black text-blue-400 tracking-widest uppercase">Étape {item.step}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-2 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="temoignages" className="py-24 px-6 bg-gray-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">Programme Beta — Brazzaville & Pointe-Noire</p>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Ce qu'ils disent de Kelassi
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-900 rounded-3xl p-7 border border-gray-800 card-hover">
                <div className="flex gap-1 mb-5">
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} className="text-amber-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${t.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.school}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOBILE APP ── */}
      <section className="py-24 px-6 bg-blue-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-700 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-blue-200 text-sm font-bold uppercase tracking-widest mb-4">Application mobile</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Révise même sans connexion
          </h2>
          <p className="text-blue-100 mb-10 max-w-lg mx-auto text-lg leading-relaxed">
            Télécharge tes cours en avance. Révise dans le bus, sans WiFi. Tes flashcards se synchronisent quand tu te reconnectes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="inline-flex items-center gap-4 bg-black text-white px-7 py-4 rounded-2xl font-medium hover:bg-gray-900 transition-all hover:scale-105"
            >
              <span className="text-3xl">🍎</span>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium">Disponible sur</p>
                <p className="text-base font-bold">App Store</p>
              </div>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-4 bg-black text-white px-7 py-4 rounded-2xl font-medium hover:bg-gray-900 transition-all hover:scale-105"
            >
              <span className="text-3xl">🤖</span>
              <div className="text-left">
                <p className="text-xs text-gray-400 font-medium">Disponible sur</p>
                <p className="text-base font-bold">Google Play</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Prêt à commencer ?
          </h2>
          <p className="text-xl text-gray-500 mb-10">
            10 questions IA gratuites par jour. Pas de carte bancaire requise.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all hover:scale-105 shadow-xl shadow-blue-200"
          >
            Créer mon compte gratuit →
          </Link>
          <p className="text-sm text-gray-400 mt-5">Gratuit · Sans engagement · Pour les élèves congolais 🇨🇬</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-950 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">K</span>
              </div>
              <span className="text-xl font-black text-white">Kelassi</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
              <Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
              <a href="mailto:support@kelassi.app" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm text-gray-600">© 2026 Alpha-Tech · Congo Brazzaville 🇨🇬</p>
          </div>
        </div>
      </footer>

    </main>
  )
}
