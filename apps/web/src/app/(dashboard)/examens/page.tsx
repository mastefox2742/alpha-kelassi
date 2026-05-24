import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ExamensHistorique } from './examens-historique'
import {
  Calculator, FlaskConical, Leaf, BookOpen, Globe, Brain,
  Languages, TrendingUp, Monitor, Activity, BookMarked,
  type LucideIcon,
} from 'lucide-react'

interface SearchParams { level?: string; subject?: string; year?: string; session?: string }

const LEVEL_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string
  headerBg: string; dot: string; accent: string
}> = {
  bepc:  { label: 'BEPC',  color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-300',   headerBg: 'bg-blue-500',    dot: 'bg-blue-500',    accent: 'text-blue-600'   },
  bac_a: { label: 'BAC A', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-300',  headerBg: 'bg-amber-500',   dot: 'bg-amber-500',   accent: 'text-amber-600'  },
  bac_c: { label: 'BAC C', color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-300', headerBg: 'bg-violet-500',  dot: 'bg-violet-500',  accent: 'text-violet-600' },
  bac_d: { label: 'BAC D', color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-300',headerBg: 'bg-emerald-500', dot: 'bg-emerald-500', accent: 'text-emerald-600'},
}

function SubjectIcon({ name, className }: { name: string; className?: string }) {
  const n = name.toLowerCase()
  let Icon: LucideIcon = BookMarked
  if (n.includes('math'))                                              Icon = Calculator
  else if (n.includes('physique') || n.includes('chimie'))            Icon = FlaskConical
  else if (n.includes('svt') || n.includes('biolog') || n.includes('vie')) Icon = Leaf
  else if (n.includes('français') || n.includes('litt'))              Icon = BookOpen
  else if (n.includes('histoire') || n.includes('géo'))               Icon = Globe
  else if (n.includes('philo'))                                        Icon = Brain
  else if (n.includes('anglais') || n.includes('langue'))             Icon = Languages
  else if (n.includes('économ') || n.includes('gestion'))             Icon = TrendingUp
  else if (n.includes('info'))                                         Icon = Monitor
  else if (n.includes('sport') || n.includes('eps'))                  Icon = Activity
  return <Icon className={className ?? 'w-8 h-8'} strokeWidth={1.5} />
}

export default async function ExamensPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { level, subject: subjectId, year, session } = await searchParams
  const supabase = await createClient()

  const [{ data: documents }, { data: subjects }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, title, level, year, session, is_premium, corrige_url, subject_id, subjects(id, name, level)')
      .eq('type', 'examen')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('subjects').select('id, name, level').order('level').order('name'),
  ])

  const allDocs     = documents ?? []
  const allSubjects = subjects  ?? []

  /* ── Vue 2 : liste des sujets d'une matière ──────────────────────────── */
  if (subjectId) {
    const currentSubject = allSubjects.find((s) => s.id === subjectId)
    const lvl = currentSubject ? (LEVEL_CONFIG[currentSubject.level] ?? LEVEL_CONFIG['bepc']) : LEVEL_CONFIG['bepc']

    let docs = allDocs.filter((d) => (d.subjects as { id: string } | null)?.id === subjectId)
    if (year)    docs = docs.filter((d) => d.year?.toString() === year)
    if (session) docs = docs.filter((d) => d.session === session)

    const availableYears = [...new Set(
      allDocs.filter((d) => (d.subjects as { id: string } | null)?.id === subjectId)
             .map((d) => d.year?.toString()).filter(Boolean) as string[]
    )].sort((a, b) => b.localeCompare(a))

    // Regrouper par année
    const byYear = docs.reduce<Record<string, typeof docs>>((acc, doc) => {
      const y = doc.year?.toString() ?? 'N/A'
      if (!acc[y]) acc[y] = []
      acc[y].push(doc)
      return acc
    }, {})
    const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a))

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Fil d'Ariane */}
        <nav className="flex items-center gap-1.5 text-sm mb-6 flex-wrap">
          <Link href="/examens" className="text-violet-600 hover:underline font-medium">Examens</Link>
          {currentSubject && (
            <>
              <span className="text-gray-300">›</span>
              <Link
                href={`/examens?level=${currentSubject.level}`}
                className={`font-semibold ${lvl.color} hover:underline`}
              >
                {lvl.label}
              </Link>
              <span className="text-gray-300">›</span>
              <span className="text-gray-700 font-semibold text-xs uppercase tracking-wide">
                {currentSubject.name}
              </span>
            </>
          )}
        </nav>

        {/* En-tête matière */}
        {currentSubject && (
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${lvl.bg} border-2 ${lvl.border} ${lvl.color}`}>
              <SubjectIcon name={currentSubject.name} className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">{currentSubject.name}</h1>
              <p className="text-sm text-gray-400">{docs.length} sujet{docs.length !== 1 ? 's' : ''} · {lvl.label}</p>
            </div>
          </div>
        )}

        {/* Filtres année + session */}
        <div className="flex flex-wrap gap-2 mb-6">
          {availableYears.slice(0, 8).map((y) => (
            <Link
              key={y}
              href={`/examens?subject=${subjectId}${year === y ? '' : `&year=${y}`}${session ? `&session=${session}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                year === y
                  ? `${lvl.headerBg} text-white border-transparent`
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {y}
            </Link>
          ))}
          {[{ v: 'normale', l: '✅ Normale' }, { v: 'rattrapage', l: '🔄 Rattrapage' }].map(({ v, l }) => (
            <Link
              key={v}
              href={`/examens?subject=${subjectId}${year ? `&year=${year}` : ''}${session === v ? '' : `&session=${v}`}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                session === v
                  ? 'bg-gray-700 text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {l}
            </Link>
          ))}
          {(year || session) && (
            <Link
              href={`/examens?subject=${subjectId}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 bg-white hover:bg-red-50 transition-all"
            >
              ✕ Réinitialiser
            </Link>
          )}
        </div>

        {/* Liste des sujets par année */}
        {sortedYears.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">Aucun sujet trouvé.</p>
            <Link href="/examens" className="inline-block mt-4 text-sm font-semibold text-violet-600 hover:underline">
              ← Retour aux matières
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedYears.map((yr) => (
              <div key={yr}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-black text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">📅 {yr}</span>
                  <span className="text-xs text-gray-400">{byYear[yr].length} sujet{byYear[yr].length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {byYear[yr].map((doc, idx) => {
                    const hasCorrige   = !!doc.corrige_url
                    return (
                      <Link
                        key={doc.id}
                        href={`/examens/${doc.id}`}
                        className={`group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-violet-200 hover:shadow-md transition-all`}
                      >
                        {/* Numéro */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 ${lvl.border} bg-white flex items-center justify-center`}>
                          <span className={`text-xs font-bold ${lvl.color}`}>{String(idx + 1).padStart(2, '0')}</span>
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800 group-hover:text-violet-700 transition-colors text-sm leading-snug">
                            {doc.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {doc.session && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                doc.session === 'rattrapage'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {doc.session === 'rattrapage' ? '🔄' : '✅'} {doc.session}
                              </span>
                            )}
                            {hasCorrige && !doc.is_premium && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 font-medium">
                                ✅ Corrigé
                              </span>
                            )}
                            {hasCorrige && doc.is_premium && (
                              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 font-semibold">
                                ⭐ Corrigé Premium
                              </span>
                            )}
                            {!hasCorrige && (
                              <span className="text-xs text-gray-300 border border-gray-100 px-2 py-0.5 rounded-full">
                                Sans corrigé
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Flèche */}
                        <span className="flex-shrink-0 text-sm font-bold text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── Vue 1 : grille des matières par niveau ───────────────────────────── */
  const activeLevel = level ?? ''
  const docsPerSubject = allDocs.reduce<Record<string, number>>((acc, d) => {
    const sid = (d.subjects as { id: string } | null)?.id
    if (sid) acc[sid] = (acc[sid] ?? 0) + 1
    return acc
  }, {})

  const filteredSubjects = activeLevel
    ? allSubjects.filter((s) => s.level === activeLevel)
    : allSubjects

  const levelTabs = [
    { value: '',      label: 'Tous' },
    { value: 'bepc',  label: 'BEPC' },
    { value: 'bac_a', label: 'BAC A' },
    { value: 'bac_c', label: 'BAC C' },
    { value: 'bac_d', label: 'BAC D' },
  ]

  const sessionTabs = [
    { value: '',           label: 'Toutes sessions' },
    { value: 'normale',    label: '✅ Session normale' },
    { value: 'rattrapage', label: '🔄 Rattrapage' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900">Examens d'État</h1>
        <p className="text-gray-400 mt-1 text-sm">Congo Brazzaville · BEPC & BAC</p>
      </div>

      {/* Historique récent */}
      <ExamensHistorique />

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-8 space-y-3">
        {/* Niveau */}
        <div className="flex flex-wrap gap-2">
          {levelTabs.map((tab) => {
            const cfg = LEVEL_CONFIG[tab.value]
            return (
              <Link
                key={tab.value}
                href={tab.value ? `/examens?level=${tab.value}` : '/examens'}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  activeLevel === tab.value
                    ? cfg
                      ? `${cfg.headerBg} text-white border-transparent shadow-sm`
                      : 'bg-gray-900 text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Session */}
        <div className="flex flex-wrap gap-2">
          {sessionTabs.map((s) => (
            <Link
              key={s.value}
              href={`/examens${s.value ? `?session=${s.value}${activeLevel ? `&level=${activeLevel}` : ''}` : activeLevel ? `?level=${activeLevel}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                (session ?? '') === s.value
                  ? 'bg-gray-700 text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Grille des matières */}
      {filteredSubjects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">Aucune matière disponible.</p>
        </div>
      ) : activeLevel ? (
        <ExamenSubjectGrid subjects={filteredSubjects} docsPerSubject={docsPerSubject} />
      ) : (
        <div className="space-y-10">
          {(['bepc', 'bac_a', 'bac_c', 'bac_d'] as const).map((lvlKey) => {
            const lvlSubjects = filteredSubjects.filter((s) => s.level === lvlKey)
            if (lvlSubjects.length === 0) return null
            const cfg = LEVEL_CONFIG[lvlKey]
            return (
              <div key={lvlKey}>
                <div className="flex items-center gap-3 mb-4">
                  <Link
                    href={`/examens?level=${lvlKey}`}
                    className={`px-3 py-1 rounded-lg text-sm font-black ${cfg.headerBg} text-white hover:opacity-90 transition-opacity`}
                  >
                    {cfg.label}
                  </Link>
                  <span className="text-xs text-gray-400">
                    {lvlSubjects.reduce((s, sub) => s + (docsPerSubject[sub.id] ?? 0), 0)} sujets
                  </span>
                </div>
                <ExamenSubjectGrid subjects={lvlSubjects} docsPerSubject={docsPerSubject} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Grille de cartes matières (examens) ──────────────────────────────── */
function ExamenSubjectGrid({
  subjects,
  docsPerSubject,
}: {
  subjects: { id: string; name: string; level: string }[]
  docsPerSubject: Record<string, number>
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {subjects.map((s) => {
        const cfg   = LEVEL_CONFIG[s.level] ?? LEVEL_CONFIG['bepc']
        const count = docsPerSubject[s.id] ?? 0

        return (
          <Link
            key={s.id}
            href={`/examens?subject=${s.id}`}
            className={`group relative flex flex-col rounded-2xl border-2 ${cfg.border} bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200`}
          >
            {/* Barre colorée */}
            <div className={`${cfg.headerBg} px-3 py-2 flex items-center justify-between`}>
              <span className="text-white font-black text-xs tracking-wider uppercase truncate">{cfg.label}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
                <circle cx="10" cy="10" r="8" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2" />
              </svg>
            </div>

            {/* Icône */}
            <div className={`flex-1 flex items-center justify-center py-6 ${cfg.bg} ${cfg.color}`}>
              <SubjectIcon name={s.name} className="w-10 h-10" />
            </div>

            {/* Nom */}
            <div className="px-3 py-2.5 bg-white border-t border-gray-100 text-center">
              <p className={`text-xs font-bold ${cfg.color} leading-tight line-clamp-2`}>
                {s.name}
              </p>
              {count > 0 ? (
                <p className="text-xs text-gray-400 mt-0.5">{count} sujet{count !== 1 ? 's' : ''}</p>
              ) : (
                <p className="text-xs text-gray-300 mt-0.5">Bientôt</p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
