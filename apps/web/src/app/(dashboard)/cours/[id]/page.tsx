import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { FreeLimitGate } from '@/components/free-limit-gate'
import { DocumentReaderClient } from '@/components/document-reader-client'
import Link from 'next/link'

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  bepc:  { label: 'BEPC',  color: 'text-blue-700',   bg: 'bg-blue-100' },
  bac_a: { label: 'BAC A', color: 'text-amber-700',   bg: 'bg-amber-100' },
  bac_c: { label: 'BAC C', color: 'text-violet-700',  bg: 'bg-violet-100' },
  bac_d: { label: 'BAC D', color: 'text-emerald-700', bg: 'bg-emerald-100' },
}

export default async function CoursDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: doc } = await supabase
    .from('documents')
    .select('*, subjects(name, level)')
    .eq('id', id)
    .single()

  if (!doc) notFound()

  const { data: profile } = await supabase.from('users').select('plan').eq('id', user.id).single()
  const plan = profile?.plan ?? 'free'

  // Gate Premium
  if (doc.is_premium && plan !== 'premium') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">⭐</div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Contenu Premium</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Ce document est réservé aux abonnés Premium. Passe à Premium pour accéder à tous les cours et examens.
          </p>
          <Link
            href="/billing"
            className="w-full inline-block py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity shadow-md"
          >
            Passer à Premium — 2 000 FCFA/mois
          </Link>
          <Link href="/cours" className="inline-block mt-4 text-sm text-gray-400 hover:text-gray-600">
            ← Retour aux cours
          </Link>
        </div>
      </div>
    )
  }

  // URL signée pour téléchargement (reste accessible, mais pas affichée)
  const bucket = doc.is_premium ? 'pdfs-premium' : 'pdfs-public'
  const fileName = doc.pdf_url?.split('/').pop() ?? ''
  const { data: signed } = fileName
    ? await supabase.storage.from(bucket).createSignedUrl(fileName, 900)
    : { data: null }

  const lvl = LEVEL_CONFIG[doc.level] ?? { label: doc.level, color: 'text-gray-600', bg: 'bg-gray-100' }
  const isExam = doc.type === 'examen'
  const subjectName = (doc.subjects as { name: string } | null)?.name
  const hasText = !!(doc as Record<string, unknown>).text_content

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link href={isExam ? '/examens' : '/cours'} className="hover:text-gray-600 transition-colors font-medium">
          {isExam ? 'Examens' : 'Cours'}
        </Link>
        <span>›</span>
        {subjectName && <><span className="text-gray-500">{subjectName}</span><span>›</span></>}
        <span className="text-gray-700 truncate max-w-xs">{doc.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
            isExam ? 'bg-violet-100' : 'bg-blue-100'
          }`}>
            {isExam ? '📝' : '📖'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 leading-snug mb-2">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${lvl.bg} ${lvl.color}`}>
                {lvl.label}
              </span>
              {subjectName && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  {subjectName}
                </span>
              )}
              {doc.year && <span className="text-xs text-gray-400 font-medium">{doc.year}</span>}
              {doc.is_premium && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">⭐ Premium</span>
              )}
              {!hasText && (
                <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full font-medium">
                  ⏳ Indexation en cours…
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {signed?.signedUrl && (
              <a
                href={signed.signedUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                title="Télécharger le fichier original"
                className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                ⬇️ <span className="hidden sm:inline">Fichier</span>
              </a>
            )}
            <Link
              href={`/tuteur?document=${doc.id}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              🤖 <span className="hidden sm:inline">Demander à Kelassi</span><span className="sm:hidden">Kelassi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contenu formaté */}
      <FreeLimitGate type="cours" plan={plan}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {hasText ? (
            <DocumentReaderClient
              text={(doc as Record<string, unknown>).text_content as string}
            />
          ) : (
            /* Fallback : document pas encore indexé — affiche message */
            <div className="p-12 text-center">
              <p className="text-4xl mb-4">⏳</p>
              <p className="text-gray-700 font-semibold mb-2">Contenu en cours de traitement</p>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                Le texte de ce document est en cours d'extraction. Reviens dans quelques minutes.
              </p>
              {signed?.signedUrl && (
                <a
                  href={signed.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  Voir le fichier original ↗
                </a>
              )}
            </div>
          )}
        </div>
      </FreeLimitGate>
    </div>
  )
}

