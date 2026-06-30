import { adminDb } from '@/lib/firebase/admin'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Calculator, FlaskConical, Leaf, BookOpen, Globe, Brain,
  Languages, TrendingUp, Monitor, Activity, BookMarked,
  type LucideIcon,
} from 'lucide-react'

interface SearchParams { level?: string; subject?: string }

/* ── Config niveaux ─────────────────────────────────────────────────────── */
const LEVEL_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string
  headerBg: string; headerText: string; dot: string
}> = {
  bepc:  { label: 'BEPC',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300',   headerBg: 'bg-blue-500',    headerText: 'text-white', dot: 'bg-blue-500'   },
  bac_a: { label: 'BAC A', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300',  headerBg: 'bg-amber-500',   headerText: 'text-white', dot: 'bg-amber-500'  },
  bac_c: { label: 'BAC C', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-300', headerBg: 'bg-violet-500',  headerText: 'text-white', dot: 'bg-violet-500' },
  bac_d: { label: 'BAC D', color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-300',headerBg: 'bg-emerald-500', headerText: 'text-white', dot: 'bg-emerald-500'},
}

/* ── Icônes par matière ──────────────────────────────────────────────────── */
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

export default async function CoursPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { level, subject: subjectId } = await searchParams

  const [subjectsSnap, docsSnap] = await Promise.all([
    adminDb.collection('subjects').orderBy('level').orderBy('name').get().catch(() => null),
    adminDb.collection('documents').where('type', '==', 'cours').orderBy('created_at', 'desc').limit(200).get().catch(() => null),
  ])

  type Subject = { id: string; name: string; level: string }
  type Doc = { id: string; title: string; type: string; level: string; year: number | null; is_premium: boolean; pdf_url: string | null; subject_id: string; subjects: { id: string; name: string; level: string } | null }

  const allSubjects: Subject[] = subjectsSnap?.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subject, 'id'>) })) ?? []
  const allDocs: Doc[] = docsSnap?.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, subjects: allSubjects.find((s) => s.id === data.subject_id) ?? null }
  }) as Doc[] ?? []

  /* ── Vue 2 : liste de documents pour une matière ─────────────────────── */
  if (subjectId) {
    const currentSubject = allSubjects.find((s) => s.id === subjectId)
    if (!currentSubject) redirect('/cours')

    const lvl  = LEVEL_CONFIG[currentSubject.level] ?? LEVEL_CONFIG['bepc']
    const docs = allDocs.filter((d) => d.subjects?.id === subjectId)

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Fil d'Ariane */}
        <nav className="flex items-center gap-1.5 text-sm mb-8 flex-wrap">
          <Link href="/cours" className="text-blue-600 hover:underline font-medium">Cours</Link>
          <span className="text-gray-300">›</span>
          <Link
            href={`/cours?level=${currentSubject.level}`}
            className={`font-semibold ${lvl.color} hover:underline`}
          >
            {lvl.label}
          </Link>
          <span className="text-gray-300">›</span>
          <span className="text-gray-700 font-semibold uppercase tracking-wide text-xs">
            {currentSubject.name}
          </span>
        </nav>

        {/* Titre */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${lvl.bg} border-2 ${lvl.border} ${lvl.color}`}>
            <SubjectIcon name={currentSubject.name} className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{currentSubject.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {docs.length} chapitre{docs.length !== 1 ? 's' : ''} · {lvl.label}
            </p>
          </div>
        </div>

        {/* Liste des chapitres */}
        {docs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 font-medium">Aucun cours disponible pour cette matière.</p>
            <Link href="/cours" className="inline-block mt-4 text-sm font-semibold text-blue-600 hover:underline">
              ← Retour aux matières
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc, idx) => (
              <Link
                key={doc.id}
                href={`/cours/${doc.id}`}
                className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-md transition-all"
              >
                {/* Numéro / cercle */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 ${lvl.border} bg-white flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${lvl.color}`}>{String(idx + 1).padStart(2, '0')}</span>
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-base group-hover:${lvl.color} transition-colors text-gray-800`}>
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {doc.year && (
                      <span className="text-xs text-gray-400">{doc.year}</span>
                    )}
                    {doc.is_premium && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">⭐ Premium</span>
                    )}
                    {doc.pdf_url?.toLowerCase().endsWith('.pdf') && (
                      <span className="text-xs text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full border">PDF</span>
                    )}
                  </div>
                </div>

                {/* Flèche */}
                <span className={`flex-shrink-0 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity ${lvl.color}`}>
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── Vue 1 : grille des matières (filtrée par niveau) ─────────────────── */
  const activeLevel = level ?? ''
  const filteredSubjects = activeLevel
    ? allSubjects.filter((s) => s.level === activeLevel)
    : allSubjects

  // Compte les docs par matière
  const docsPerSubject = allDocs.reduce<Record<string, number>>((acc, d) => {
    const sid = d.subjects?.id ?? d.subject_id
    if (sid) acc[sid] = (acc[sid] ?? 0) + 1
    return acc
  }, {})

  // Sujets avec au moins 1 document en premier
  const sortedSubjects = [...filteredSubjects].sort((a, b) =>
    (docsPerSubject[b.id] ?? 0) - (docsPerSubject[a.id] ?? 0)
  )

  // Code matière : numéro sur 3 chiffres selon position dans la liste par niveau
  const subjectsByLevel: Record<string, typeof allSubjects> = {}
  allSubjects.forEach((s) => {
    if (!subjectsByLevel[s.level]) subjectsByLevel[s.level] = []
    subjectsByLevel[s.level].push(s)
  })
  function subjectCode(s: { id: string; level: string }): string {
    const idx = (subjectsByLevel[s.level] ?? []).findIndex((x) => x.id === s.id)
    return String((idx + 1) * 10).padStart(3, '0')
  }

  const levelTabs = [
    { value: '',      label: 'Tous' },
    { value: 'bepc',  label: 'BEPC' },
    { value: 'bac_a', label: 'BAC A' },
    { value: 'bac_c', label: 'BAC C' },
    { value: 'bac_d', label: 'BAC D' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Cours & Révisions</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {sortedSubjects.length} matière{sortedSubjects.length !== 1 ? 's' : ''} disponible{sortedSubjects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Onglets niveau */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {levelTabs.map((tab) => {
          const cfg = LEVEL_CONFIG[tab.value]
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/cours?level=${tab.value}` : '/cours'}
              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                activeLevel === tab.value
                  ? cfg
                    ? `${cfg.headerBg} text-white border-transparent shadow-md`
                    : 'bg-gray-900 text-white border-transparent shadow-md'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Grille des matières */}
      {sortedSubjects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">Aucune matière disponible pour ce niveau.</p>
        </div>
      ) : (
        /* Groupé par niveau si "Tous" */
        activeLevel ? (
          <SubjectGrid subjects={sortedSubjects} docsPerSubject={docsPerSubject} subjectCode={subjectCode} />
        ) : (
          <div className="space-y-10">
            {(['bepc', 'bac_a', 'bac_c', 'bac_d'] as const).map((lvlKey) => {
              const lvlSubjects = sortedSubjects.filter((s) => s.level === lvlKey)
              if (lvlSubjects.length === 0) return null
              const cfg = LEVEL_CONFIG[lvlKey]
              return (
                <div key={lvlKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-lg text-sm font-black ${cfg.headerBg} text-white`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{lvlSubjects.length} matière{lvlSubjects.length !== 1 ? 's' : ''}</span>
                  </div>
                  <SubjectGrid subjects={lvlSubjects} docsPerSubject={docsPerSubject} subjectCode={subjectCode} />
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

/* ── Grille de cartes matières ─────────────────────────────────────────── */
function SubjectGrid({
  subjects,
  docsPerSubject,
  subjectCode,
}: {
  subjects: { id: string; name: string; level: string }[]
  docsPerSubject: Record<string, number>
  subjectCode: (s: { id: string; level: string }) => string
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {subjects.map((s) => {
        const cfg   = LEVEL_CONFIG[s.level] ?? LEVEL_CONFIG['bepc']
        const count = docsPerSubject[s.id] ?? 0
        const code  = subjectCode(s)

        return (
          <Link
            key={s.id}
            href={`/cours?subject=${s.id}`}
            className={`group relative flex flex-col rounded-2xl border-2 ${cfg.border} bg-white overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200`}
          >
            {/* Barre de titre colorée */}
            <div className={`${cfg.headerBg} px-3 py-2 flex items-center justify-between`}>
              <span className="text-white font-black text-sm tracking-wide">{code}</span>
              {/* Indicateur de progression (cercle) */}
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2" />
              </svg>
            </div>

            {/* Icône centrale */}
            <div className={`flex-1 flex items-center justify-center py-6 ${cfg.bg} ${cfg.color}`}>
              <SubjectIcon name={s.name} className="w-10 h-10" />
            </div>

            {/* Nom + compteur */}
            <div className="px-3 py-2.5 bg-white border-t border-gray-100 text-center">
              <p className={`text-xs font-bold ${cfg.color} leading-tight line-clamp-2`}>
                {s.name}
              </p>
              {count > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{count} cours</p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
