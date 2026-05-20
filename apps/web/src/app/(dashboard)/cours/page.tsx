import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface SearchParams { level?: string; subject?: string; type?: string }

export default async function CoursPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { level, subject, type } = await searchParams
  const supabase = await createClient()

  const [{ data: subjects }, { data: documents }] = await Promise.all([
    supabase.from('subjects').select('id, name, level').order('level').order('name'),
    supabase
      .from('documents')
      .select('id, title, type, level, year, is_premium, subjects(name)')
      .eq(type ? 'type' : 'is_premium', type ?? false) // hack: filtre dynamique
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Refiltrage côté serveur selon params
  const filteredDocs = (documents ?? []).filter((d) => {
    if (level && d.level !== level) return false
    if (subject && (d.subjects as { name: string } | null)?.name !== subject) return false
    if (type && d.type !== type) return false
    return true
  })

  const levels = [
    { value: '', label: 'Tous niveaux' },
    { value: 'bepc', label: 'BEPC' },
    { value: 'bac_a', label: 'BAC A' },
    { value: 'bac_c', label: 'BAC C' },
    { value: 'bac_d', label: 'BAC D' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cours & Révisions</h1>
        <p className="text-gray-500 text-sm">{filteredDocs.length} document(s) disponible(s)</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {levels.map((l) => (
          <Link
            key={l.value}
            href={l.value ? `/cours?level=${l.value}` : '/cours'}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              (level ?? '') === l.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href={type === 'examen' ? (level ? `/cours?level=${level}` : '/cours') : (level ? `/cours?level=${level}&type=examen` : '/cours?type=examen')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            type === 'examen'
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          📝 Examens d'État
        </Link>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <Link
            key={doc.id}
            href={`/cours/${doc.id}`}
            className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{doc.type === 'examen' ? '📝' : '📖'}</span>
              {doc.is_premium && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  ⭐ Premium
                </span>
              )}
            </div>
            <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-blue-600">
              {doc.title}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase">{doc.level.replace('_', ' ')}</span>
              {doc.year && <span className="text-xs text-gray-400">· {doc.year}</span>}
            </div>
          </Link>
        ))}
        {filteredDocs.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p>Aucun document pour ces filtres.</p>
          </div>
        )}
      </div>
    </div>
  )
}
