import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ExamensHistorique } from './examens-historique'

interface SearchParams {
  level?: string
  session?: string
  subject?: string
  year?: string
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  bepc:  { label: 'BEPC',  color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-500' },
  bac_a: { label: 'BAC A', color: 'text-amber-700',  bg: 'bg-amber-100',  dot: 'bg-amber-500' },
  bac_c: { label: 'BAC C', color: 'text-violet-700', bg: 'bg-violet-100', dot: 'bg-violet-500' },
  bac_d: { label: 'BAC D', color: 'text-emerald-700',bg: 'bg-emerald-100',dot: 'bg-emerald-500' },
}

export default async function ExamensPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { level, session, subject, year } = await searchParams
  const supabase = await createClient()

  const [{ data: documents }, { data: subjects }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, title, type, level, year, session, is_premium, corrige_url, subjects(id, name)')
      .eq('type', 'examen')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('subjects').select('id, name').order('name'),
  ])

  const filteredDocs = (documents ?? []).filter((d) => {
    if (level && d.level !== level) return false
    if (session && d.session !== session) return false
    if (subject && (d.subjects as { id: string } | null)?.id !== subject) return false
    if (year && d.year?.toString() !== year) return false
    return true
  })

  // Années disponibles (après filtres matière+niveau+session, sans filtre année)
  const docsForYears = (documents ?? []).filter((d) => {
    if (level && d.level !== level) return false
    if (session && d.session !== session) return false
    if (subject && (d.subjects as { id: string } | null)?.id !== subject) return false
    return true
  })
  const availableYears = [...new Set(docsForYears.map((d) => d.year?.toString()).filter(Boolean) as string[])].sort((a, b) => b.localeCompare(a))

  const byYear = filteredDocs.reduce<Record<string, typeof filteredDocs>>((acc, doc) => {
    const y = doc.year?.toString() ?? 'N/A'
    if (!acc[y]) acc[y] = []
    acc[y].push(doc)
    return acc
  }, {})
  const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a))

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const merged = { level, session, subject, year, ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    const s = p.toString()
    return s ? `/examens?${s}` : '/examens'
  }

  const levels = [
    { value: '', label: 'Tous les niveaux', dot: 'bg-gray-400' },
    { value: 'bepc',  label: 'BEPC',  dot: 'bg-blue-500' },
    { value: 'bac_a', label: 'BAC A', dot: 'bg-amber-500' },
    { value: 'bac_c', label: 'BAC C', dot: 'bg-violet-500' },
    { value: 'bac_d', label: 'BAC D', dot: 'bg-emerald-500' },
  ]
  const sessions = [
    { value: '',           label: 'Toutes sessions' },
    { value: 'normale',    label: '✅ Normale' },
    { value: 'rattrapage', label: '🔄 Rattrapage' },
  ]

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Examens d'État</h1>
        <p className="text-gray-500 mt-1">
          {filteredDocs.length} sujet{filteredDocs.length !== 1 ? 's' : ''} · Congo Brazzaville
        </p>
      </div>

      {/* Historique (client component) */}
      <ExamensHistorique />

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 space-y-3">

        {/* Niveau */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Niveau</p>
          <div className="flex flex-wrap gap-2">
            {levels.map((l) => (
              <Link
                key={l.value}
                href={buildUrl({ level: l.value || undefined, year: undefined })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                  (level ?? '') === l.value
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Matière */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Matière</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildUrl({ subject: undefined, year: undefined })}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                !subject
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-violet-200 hover:text-violet-600'
              }`}
            >
              Toutes matières
            </Link>
            {(subjects ?? []).map((s) => (
              <Link
                key={s.id}
                href={buildUrl({ subject: s.id, year: undefined })}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                  subject === s.id
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-violet-200 hover:text-violet-600'
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Année */}
        {availableYears.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Année</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildUrl({ year: undefined })}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                  !year
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-600'
                }`}
              >
                Toutes années
              </Link>
              {availableYears.map((y) => (
                <Link
                  key={y}
                  href={buildUrl({ year: y })}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    year === y
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-amber-200 hover:text-amber-600'
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Session */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Session</p>
          <div className="flex flex-wrap gap-2">
            {sessions.map((s) => (
              <Link
                key={s.value}
                href={buildUrl({ session: s.value || undefined })}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                  (session ?? '') === s.value
                    ? 'bg-gray-700 text-white border-gray-700 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Reset filtres si actifs */}
        {(level || session || subject || year) && (
          <div className="pt-1 border-t border-gray-100">
            <Link href="/examens" className="text-xs text-red-500 hover:text-red-700 font-medium">
              ✕ Effacer tous les filtres
            </Link>
          </div>
        )}
      </div>

      {/* Résultats */}
      {sortedYears.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">📭</p>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Aucun examen trouvé</h3>
          <p className="text-gray-400 text-sm">Essaie d'autres filtres.</p>
          <Link href="/examens" className="inline-block mt-6 text-sm font-semibold text-violet-600 hover:underline">
            Voir tous les examens →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedYears.map((yr) => (
            <div key={yr}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <span className="text-violet-600 font-black text-sm">📅</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">{yr}</h2>
                  <p className="text-xs text-gray-400">{byYear[yr].length} sujet{byYear[yr].length !== 1 ? 's' : ''}</p>
                </div>
                <Link
                  href={buildUrl({ year: yr })}
                  className="ml-auto text-xs text-violet-500 hover:text-violet-700 font-medium hover:underline"
                >
                  Filtrer {yr} →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {byYear[yr].map((doc) => {
                  const lvl = LEVEL_CONFIG[doc.level] ?? { label: doc.level, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' }
                  const hasCorrige = !!doc.corrige_url
                  const subjectName = (doc.subjects as { name: string } | null)?.name

                  return (
                    <Link
                      key={doc.id}
                      href={`/examens/${doc.id}`}
                      className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center text-xl">📝</div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {doc.session && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              doc.session === 'rattrapage' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {doc.session === 'rattrapage' ? '🔄' : '✅'} {doc.session}
                            </span>
                          )}
                          {/* Badge corrigé */}
                          {hasCorrige && !doc.is_premium && (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-100">
                              ✅ Corrigé
                            </span>
                          )}
                          {hasCorrige && doc.is_premium && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-100">
                              ⭐ Corrigé Premium
                            </span>
                          )}
                          {!hasCorrige && doc.is_premium && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-100">
                              ⭐ Premium
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Titre */}
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-3 group-hover:text-violet-600 transition-colors">
                        {doc.title}
                      </h3>

                      {/* Bottom */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lvl.bg} ${lvl.color}`}>
                            {lvl.label}
                          </span>
                          {subjectName && (
                            <span className="text-xs text-gray-400">{subjectName}</span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          Ouvrir →
                        </span>
                      </div>
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
