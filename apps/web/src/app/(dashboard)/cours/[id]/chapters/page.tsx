import { getServerUser } from '@/lib/supabase/server'
import { adminDb } from '@/lib/firebase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ChaptersListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect('/login')

  const [docSnap, profileSnap, chaptersSnap] = await Promise.all([
    adminDb.collection('documents').doc(id).get(),
    adminDb.collection('users').doc(user.uid).get(),
    adminDb.collection('course_chapters')
      .where('document_id', '==', id)
      .orderBy('chapter_number', 'asc')
      .get(),
  ])

  if (!docSnap.exists) notFound()

  const doc  = { id: docSnap.id, ...docSnap.data() } as Record<string, any>
  const plan = (profileSnap.data()?.plan as string) ?? 'free'

  if (doc.is_premium && plan !== 'premium') redirect(`/cours/${id}`)

  const chapters        = chaptersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
  const doneChapters    = chapters.filter((c) => c.status === 'done')
  const pendingChapters = chapters.filter((c) => c.status !== 'done')

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link href="/cours" className="hover:text-gray-600 font-medium">Cours</Link>
        <span>›</span>
        <Link href={`/cours/${id}`} className="hover:text-gray-600 truncate max-w-[160px]">{doc.title}</Link>
        <span>›</span>
        <span className="text-gray-700">Fiches de révision</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0">
            📋
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 leading-snug">
              Fiches de révision
            </h1>
            <p className="text-sm text-gray-500 mt-1 truncate">{doc.title}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black text-violet-700">{doneChapters.length}</p>
            <p className="text-xs text-gray-400">fiches prêtes</p>
          </div>
        </div>
      </div>

      {/* En cours de génération */}
      {pendingChapters.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingChapters.length} fiche{pendingChapters.length > 1 ? 's' : ''}</strong> en cours de génération…
          </p>
        </div>
      )}

      {/* Liste des chapitres */}
      {doneChapters.length > 0 ? (
        <div className="space-y-3">
          {doneChapters.map((ch) => (
            <Link
              key={ch.id}
              href={`/cours/${id}/chapters/${ch.id}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-violet-200 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-sm font-black text-violet-700 flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                {ch.chapter_number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{ch.title}</p>
                {ch.word_count && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    ~{Math.round(ch.word_count / 200)} min de lecture
                  </p>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-4">⏳</p>
          <p className="text-gray-700 font-semibold mb-2">Fiches en cours de génération</p>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Kelassi analyse ce document et génère les fiches de révision. Reviens dans quelques minutes.
          </p>
        </div>
      )}

      {/* CTA bas de page */}
      {doneChapters.length > 0 && (
        <div className="mt-6 flex gap-3">
          <Link
            href={`/cours/${id}`}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            ← Document complet
          </Link>
          <Link
            href={`/tuteur?document=${id}`}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold text-center hover:bg-emerald-700 transition-colors shadow-sm"
          >
            🤖 Demander à Kelassi
          </Link>
        </div>
      )}
    </div>
  )
}
