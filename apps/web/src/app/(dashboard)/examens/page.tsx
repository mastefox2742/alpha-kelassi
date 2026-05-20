import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface SearchParams { level?: string; session?: string }

export default async function ExamensPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { level, session } = await searchParams
  const supabase = await createClient()

  const [{ data: subjects }, { data: documents }] = await Promise.all([
    supabase.from('subjects').select('id, name, level').order('level').order('name'),
    supabase
      .from('documents')
      .select('id, title, type, level, year, session, is_premium, subjects(name)')
      .eq('type', 'examen')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const filteredDocs = (documents ?? []).filter((d) => {
    if (level && d.level !== level) return false
    if (session && d.session !== session) return false
    return true
  })

  const levels = [
    { value: '', label: 'Tous niveaux' },
    { value: 'bepc', label: 'BEPC' },
    { value: 'bac_a', label: 'BAC A' },
    { value: 'bac_c', label: 'BAC C' },
    { value: 'bac_d', label: 'BAC D' },
  ]

  const sessions = [
    { value: '', label: 'Toutes sessions' },
    { value: 'normale', label: 'Session normale' },
    { value: 'rattrapage', label: 'Rattrapage' },
  ]

  // Group by year for better display
  const byYear = filteredDocs.reduce<Record<string, typeof filteredDocs>>((acc, doc) => {
    const y = doc.year?.toString() ?? 'N/A'
    if (!acc[y]) acc[y] = []
    acc[y].push(doc)
    return acc
  }, {})
  const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a))

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Examens d'État</h1>
        <p className="text-gray-500 text-sm">{filteredDocs.length} sujet(s) disponible(s)</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {levels.map((l) => (
          <Link
            key={l.value}
            href={
              l.value
                ? session ? `/examens?level=${l.value}&session=${session}` : `/examens?level=${l.value}`
                : session ? `/examens?session=${session}` : '/examens'
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              (level ?? '') === l.value
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <span className="w-px bg-gray-200 self-stretch mx-1" />
        {sessions.map((s) => (
          <Link
            key={s.value}
            href={
              s.value
                ? level ? `/examens?level=${level}&session=${s.value}` : `/examens?session=${s.value}`
                : level ? `/examens?level=${level}` : '/examens'
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              (session ?? '') === s.value
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Par année */}
      {sortedYears.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Aucun examen pour ces filtres.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedYears.map((year) => (
            <div key={year}>
              <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-purple-600">📅</span> {year}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {byYear[year].map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/examens/${doc.id}`}
                    className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">📝</span>
                      <div className="flex items-center gap-1">
                        {doc.session && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            doc.session === 'rattrapage'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {doc.session}
                          </span>
                        )}
                        {doc.is_premium && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            ⭐
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-purple-600">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full uppercase font-medium">
                        {doc.level.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(doc.subjects as { name: string } | null)?.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
