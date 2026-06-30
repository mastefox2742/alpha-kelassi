import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ExamenViewer } from './examen-viewer'
import { FreeLimitGate } from '@/components/free-limit-gate'
import { DocumentReaderClient } from '@/components/document-reader-client'

const LEVEL_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  bepc:  { label: 'BEPC',  bg: 'bg-blue-100',   color: 'text-blue-700' },
  bac_a: { label: 'BAC A', bg: 'bg-amber-100',  color: 'text-amber-700' },
  bac_c: { label: 'BAC C', bg: 'bg-violet-100', color: 'text-violet-700' },
  bac_d: { label: 'BAC D', bg: 'bg-emerald-100',color: 'text-emerald-700' },
}

export default async function ExamenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect('/login')

  const docSnap = await adminDb.collection('documents').doc(id).get()
  if (!docSnap.exists) notFound()

  const doc = { id: docSnap.id, ...docSnap.data() } as Record<string, any>
  if (doc.type !== 'examen') notFound()

  const profileSnap = await adminDb.collection('users').doc(user.uid).get()
  const plan        = (profileSnap.data()?.plan as string) ?? 'free'

  // Gate contenu premium
  if (doc.is_premium && plan !== 'premium') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-5xl mb-4">⭐</p>
        <h2 className="text-xl font-bold mb-2">Contenu Premium</h2>
        <p className="text-gray-500 mb-6">Cet examen est réservé aux abonnés Premium.</p>
        <Link
          href="/billing"
          className="inline-block px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
        >
          Passer à Premium — 2 000 FCFA/mois
        </Link>
      </div>
    )
  }

  // Exercices indexés par le RAG
  const [exercisesSnap, contextChunksSnap] = await Promise.all([
    adminDb.collection('document_chunks')
      .where('document_id', '==', id)
      .where('metadata.is_exercise', '==', true)
      .orderBy('chunk_index', 'asc')
      .limit(30)
      .get(),
    adminDb.collection('document_chunks')
      .where('document_id', '==', id)
      .orderBy('chunk_index', 'asc')
      .limit(60)
      .get(),
  ])

  const exercises    = exercisesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const contextChunks = contextChunksSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c: any) => !c.metadata?.is_exercise)

  const enonceUrl  = doc.pdf_url ?? null
  const corrigeUrl = doc.corrige_url ?? null
  const lvl        = LEVEL_CONFIG[doc.level] ?? { label: doc.level, bg: 'bg-gray-100', color: 'text-gray-600' }
  const hasCorrige = !!doc.corrige_url

  const isPdf      = doc.pdf_url?.toLowerCase().endsWith('.pdf') ?? false
  const textContent = doc.text_content as string | null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/examens" className="hover:text-gray-600 transition-colors">Examens</Link>
        <span>›</span>
        {doc.level && (
          <>
            <Link href={`/examens?level=${doc.level}`} className="hover:text-violet-600 transition-colors">
              {lvl.label}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="text-gray-700 truncate max-w-xs">{doc.title}</span>
      </nav>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lvl.bg} ${lvl.color}`}>
              {lvl.label}
            </span>
            {doc.year && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                📅 {doc.year}
              </span>
            )}
            {doc.session && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                doc.session === 'rattrapage'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {doc.session === 'rattrapage' ? '🔄' : '✅'} Session {doc.session}
              </span>
            )}
            {hasCorrige && !doc.is_premium && (
              <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium border border-green-100">
                ✅ Corrigé disponible
              </span>
            )}
            {hasCorrige && doc.is_premium && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-semibold border border-amber-100">
                ⭐ Corrigé Premium inclus
              </span>
            )}
            {!hasCorrige && (
              <span className="text-xs bg-gray-50 text-gray-400 px-2.5 py-1 rounded-full border border-gray-100">
                Corrigé non disponible
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/tuteur?document=${doc.id}`}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          🤖 Demander à Kelassi
        </Link>
      </div>

      {/* Visionneuse avec gate freemium */}
      <FreeLimitGate type="exam" plan={plan}>
        {isPdf && enonceUrl ? (
          <ExamenViewer
            docId={doc.id}
            title={doc.title}
            level={doc.level}
            year={doc.year ?? null}
            enonceUrl={enonceUrl}
            corrigeUrl={corrigeUrl}
            corrigeIsPremium={!!doc.is_premium}
            exercises={exercises}
            contextChunks={contextChunks}
          />
        ) : textContent ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <DocumentReaderClient text={textContent} />
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-400">
            <p className="text-2xl mb-2">⏳</p>
            <p className="font-medium text-gray-600">Contenu en cours de traitement</p>
            <p className="text-sm mt-1">Reviens dans quelques instants.</p>
          </div>
        )}
      </FreeLimitGate>
    </div>
  )
}
