import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ExamenViewer } from './examen-viewer'

export default async function ExamenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: doc } = await supabase
    .from('documents')
    .select('*, subjects(name, level)')
    .eq('id', id)
    .eq('type', 'examen')
    .single()

  if (!doc) notFound()

  // Gate premium
  if (doc.is_premium) {
    const { data: profile } = await supabase.from('users').select('plan').eq('id', user.id).single()
    if (profile?.plan !== 'premium') {
      return (
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-5xl mb-4">⭐</p>
          <h2 className="text-xl font-bold mb-2">Contenu Premium</h2>
          <p className="text-gray-500 mb-6">Cet examen est réservé aux abonnés Premium.</p>
          <Link href="/billing" className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700">
            Passer à Premium — 2 000 FCFA/mois
          </Link>
        </div>
      )
    }
  }

  const bucket = doc.is_premium ? 'pdfs-premium' : 'pdfs-public'
  const enonceFile = doc.pdf_url.split('/').pop() ?? ''
  const corrigeFile = doc.corrige_url ? doc.corrige_url.split('/').pop() ?? '' : null

  // Génère les URLs signées en parallèle
  const [{ data: enonceSign }, corrigeSign] = await Promise.all([
    supabase.storage.from(bucket).createSignedUrl(enonceFile, 900),
    corrigeFile
      ? supabase.storage.from(bucket).createSignedUrl(corrigeFile, 900)
      : Promise.resolve(null),
  ])

  // Exercices indexés par le RAG
  const { data: exercises } = await supabase
    .from('document_chunks')
    .select('id, content, chunk_index, page_number, metadata')
    .eq('document_id', id)
    .filter('metadata->>is_exercise', 'eq', 'true')
    .order('chunk_index')
    .limit(30)

  const enonceUrl = enonceSign?.signedUrl ?? null
  const corrigeUrl = (corrigeSign as { data?: { signedUrl: string } } | null)?.data?.signedUrl ?? null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/examens" className="hover:text-gray-600">Examens</Link>
        <span>›</span>
        <span className="text-gray-700 truncate max-w-xs">{doc.title}</span>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full uppercase font-medium">
              {doc.level.replace('_', ' ')}
            </span>
            {doc.year && <span className="text-xs text-gray-400">· {doc.year}</span>}
            {doc.session && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                doc.session === 'rattrapage'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {doc.session}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {(doc.subjects as { name: string } | null)?.name}
            </span>
            {doc.corrige_url && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✅ Corrigé disponible
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/tuteur?document=${doc.id}`}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          🤖 Demander à Kelassi
        </Link>
      </div>

      {enonceUrl ? (
        <ExamenViewer
          docId={doc.id}
          title={doc.title}
          enonceUrl={enonceUrl}
          corrigeUrl={corrigeUrl}
          exercises={exercises ?? []}
        />
      ) : (
        <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-400">
          URL PDF indisponible
        </div>
      )}
    </div>
  )
}
