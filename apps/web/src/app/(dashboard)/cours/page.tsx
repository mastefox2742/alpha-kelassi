import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface SearchParams { level?: string; subject?: string; type?: string }

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bepc:  { label: 'BEPC',  color: 'text-blue-700',   bg: 'bg-blue-100' },
  bac_a: { label: 'BAC A', color: 'text-amber-700',   bg: 'bg-amber-100' },
  bac_c: { label: 'BAC C', color: 'text-violet-700',  bg: 'bg-violet-100' },
  bac_d: { label: 'BAC D', color: 'text-emerald-700', bg: 'bg-emerald-100' },
}

export default async function CoursPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { level, subject, type } = await searchParams
  const supabase = await createClient()

  const [{ data: subjects }, { data: documents }] = await Promise.all([
    supabase.from('subjects').select('id, name, level').order('level').order('name'),
    supabase
      .from('documents')
      .select('id, title, type, level, year, is_premium, subjects(name)')
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const filteredDocs = (documents ?? []).filter((d) => {
    if (level && d.level !== level) return false
    if (subject && (d.subjects as { name: string } | null)?.name !== subject) return false
    if (type && d.type !== type) return false
    return true
  })

  const levels = [
    { value: '',      label: 'Tous',   dot: 'bg-gray-400' },
    { value: 'bepc',  label: 'BEPC',   dot: 'bg-blue-500' },
    { value: 'bac_a', label: 'BAC A',  dot: 'bg-amber-500' },
    { value: 'bac_c', label: 'BAC C',  dot: 'bg-violet-500' },
    { value: 'bac_d', label: 'BAC D',  dot: 'bg-emerald-500' },
  ]

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Cours & Révisions</h1>
        <p className="text-gray-500 mt-1">
          {filteredDocs.length} document{filteredDocs.length > 1 ? 's' : ''} disponible{filteredDocs.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtres niveau */}
      <div className="flex flex-wrap gap-2 mb-3">
        {levels.map((l) => (
          <Link
            key={l.value}
            href={l.value ? `/cours?level=${l.value}${type ? `&type=${type}` : ''}` : `/cours${type ? `?type=${type}` : ''}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              (level ?? '') === l.value
                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${l.dot}`} />
            {l.label}
          </Link>
        ))}
        <Link
          href={
            type === 'examen'
              ? level ? `/cours?level=${level}` : '/cours'
              : level ? `/cours?level=${level}&type=examen` : '/cours?type=examen'
          }
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
            type === 'examen'
              ? 'bg-violet-600 text-white border-violet-600 shadow-md'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          📝 Examens d'État
        </Link>
      </div>

      {/* Filtres matière */}
      {subjects && subjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {Array.from(new Set(subjects.filter(s => !level || s.level === level).map(s => s.name))).map((name) => (
            <Link
              key={name}
              href={subject === name
                ? (level ? `/cours?level=${level}` : '/cours')
                : (level ? `/cours?level=${level}&subject=${name}` : `/cours?subject=${name}`)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                subject === name
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:text-blue-600'
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      )}

      {/* Grille documents */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const lvl = LEVEL_CONFIG[doc.level] ?? { label: doc.level, color: 'text-gray-600', bg: 'bg-gray-100' }
            const isExam = doc.type === 'examen'
            return (
              <Link
                key={doc.id}
                href={`/cours/${doc.id}`}
                className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                    isExam ? 'bg-violet-100' : 'bg-blue-100'
                  }`}>
                    {isExam ? '📝' : '📖'}
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.is_premium && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                        ⭐ Premium
                      </span>
                    )}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lvl.bg} ${lvl.color}`}>
                      {lvl.label}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
                  {doc.title}
                </h3>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    {doc.year && (
                      <span className="text-xs text-gray-400 font-medium">{doc.year}</span>
                    )}
                    <span className="text-xs text-gray-300">
                      {(doc.subjects as { name: string } | null)?.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ouvrir →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">📭</p>
          <h3 className="text-lg font-bold text-gray-700 mb-2">Aucun document trouvé</h3>
          <p className="text-gray-400 text-sm">Essaie d'autres filtres ou reviens plus tard.</p>
          <Link href="/cours" className="inline-block mt-6 text-sm font-semibold text-blue-600 hover:underline">
            Voir tous les cours →
          </Link>
        </div>
      )}

    </div>
  )
}
